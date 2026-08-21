"""
Idea Watcher — Agent #1  (Phase 2 spec §6.2)

A weekly agent that scans the web for changes in each idea's problem space,
scores what it finds against the idea, writes a short digest, and emails it.

The agent is a state machine. Every node checkpoints into `agent_runs`, so a
crashed or retried run can be inspected and resumed rather than silently lost.

    [fetch_context] → load idea + last run
    [generate_queries] → AI writes 3-5 search queries
    [search] → web search each query, dedupe by URL
    [score_relevance] → AI scores each result 0-10 against the idea
    [filter] → keep top N scoring >= threshold
    [synthesize] → AI writes the digest + "what this means for you"
    [deliver] → email via Resend, persist the run

Everything here is synchronous: it runs inside an Inngest step executor thread
and uses the sync pymongo handle, matching the other inngest_functions.
"""

import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

# ─── Tuning ───────────────────────────────────────────────────────────────────
MAX_QUERIES = 4              # search queries generated per run
RESULTS_PER_QUERY = 5        # raw results pulled per query
RELEVANCE_THRESHOLD = 6      # 0-10; below this a finding is dropped
MAX_FINDINGS = 5             # findings that reach the digest
MANUAL_COOLDOWN_MINUTES = 30 # min gap between manual runs on one idea
ESTIMATED_COST_USD = 0.02    # per spec §6.2 — recorded for COGS tracking

AGENT_TYPE = "idea_watcher"


class IdeaWatcherService:
    """The Idea Watcher agent. Entry point is `run()`."""

    # ─────────────────────────────────────────────────────────────────────
    # Public entry point
    # ─────────────────────────────────────────────────────────────────────

    @staticmethod
    def run(idea_id: int, trigger: str = "cron", run_id: str | None = None) -> dict:
        """
        Execute one full watch cycle for a single idea.

        Returns a summary dict. Never raises for expected conditions (missing
        idea, no findings) — it records the outcome and returns cleanly, so an
        empty week doesn't burn Inngest retries.
        """
        from app import get_db

        db = get_db()
        agent_run_id = IdeaWatcherService._open_run(db, idea_id, trigger, run_id)

        try:
            # ── fetch_context ────────────────────────────────────────────
            IdeaWatcherService._node(db, agent_run_id, "fetch_context")
            idea = db.ideas.find_one({"id": idea_id})
            if not idea:
                return IdeaWatcherService._finish(
                    db, agent_run_id, "failed", error=f"Idea #{idea_id} not found"
                )

            user = db.users.find_one({"id": idea.get("user_id")}) or {}

            # ── generate_queries ─────────────────────────────────────────
            IdeaWatcherService._node(db, agent_run_id, "generate_queries")
            queries = IdeaWatcherService._generate_queries(idea)

            # ── search ───────────────────────────────────────────────────
            IdeaWatcherService._node(db, agent_run_id, "search")
            raw_results = IdeaWatcherService._search_all(queries)
            if not raw_results:
                return IdeaWatcherService._finish(
                    db, agent_run_id, "complete",
                    result={"findings": 0, "reason": "no_search_results"},
                    idea_id=idea_id,
                )

            # ── score_relevance + filter ─────────────────────────────────
            IdeaWatcherService._node(db, agent_run_id, "score_relevance")
            findings = IdeaWatcherService._score_and_filter(idea, raw_results)
            if not findings:
                IdeaWatcherService._touch_settings(db, idea_id)
                return IdeaWatcherService._finish(
                    db, agent_run_id, "complete",
                    result={"findings": 0, "reason": "nothing_relevant"},
                    idea_id=idea_id,
                )

            # ── synthesize ───────────────────────────────────────────────
            IdeaWatcherService._node(db, agent_run_id, "synthesize")
            digest = IdeaWatcherService._synthesize(idea, findings)

            # ── deliver ──────────────────────────────────────────────────
            IdeaWatcherService._node(db, agent_run_id, "deliver")
            digest_id = IdeaWatcherService._persist_digest(
                db, idea, findings, digest, agent_run_id, trigger
            )

            email_sent = False
            recipient = user.get("email")
            if recipient:
                email_sent = IdeaWatcherService._send_digest_email(
                    recipient, user, idea, findings, digest
                )
                if email_sent:
                    db.idea_watcher_runs.update_one(
                        {"id": digest_id}, {"$set": {"email_sent": True}}
                    )

            IdeaWatcherService._notify_in_app(db, idea, findings, digest)
            IdeaWatcherService._touch_settings(db, idea_id)

            return IdeaWatcherService._finish(
                db, agent_run_id, "complete",
                result={
                    "findings": len(findings),
                    "digest_id": digest_id,
                    "email_sent": email_sent,
                },
                idea_id=idea_id,
            )

        except Exception as e:
            logger.exception(f"[IdeaWatcher] Run failed for idea #{idea_id}")
            return IdeaWatcherService._finish(
                db, agent_run_id, "failed", error=str(e)[:500]
            )

    # ─────────────────────────────────────────────────────────────────────
    # Node: generate search queries
    # ─────────────────────────────────────────────────────────────────────

    @staticmethod
    def _generate_queries(idea: dict) -> list[str]:
        """Ask the model for focused, recent-news-shaped search queries."""
        from app.services.gemini_service import GeminiService

        title = idea.get("title", "")
        industry = idea.get("industry") or "technology"
        problem = (idea.get("problem") or idea.get("description") or "")[:600]

        prompt = f"""A founder is building this startup:

Title: {title}
Industry: {industry}
Problem it solves: {problem}

Write {MAX_QUERIES} web search queries that would surface NEWS FROM THE LAST WEEK
relevant to this founder: new competitors, funding rounds, regulation changes,
market shifts, or new technology in this space.

Rules:
- Each query must be a plain search string, 3-9 words.
- No quotes, no operators, no dates.
- Make them different from each other — cover competitors, funding, and market trends.

Return JSON only: {{"queries": ["...", "...", "...", "..."]}}"""

        try:
            res = GeminiService.call_gemini(prompt, stage="idea_watcher_queries")
            if res.get("success") and isinstance(res.get("data"), dict):
                queries = res["data"].get("queries") or []
                cleaned = [str(q).strip() for q in queries if str(q).strip()]
                if cleaned:
                    return cleaned[:MAX_QUERIES]
        except Exception as e:
            logger.warning(f"[IdeaWatcher] Query generation failed, using fallback: {e}")

        # Deterministic fallback so a model outage never kills the run
        return [
            f"{industry} startup news",
            f"{industry} funding round",
            f"{title} competitors",
            f"{industry} market trends",
        ][:MAX_QUERIES]

    # ─────────────────────────────────────────────────────────────────────
    # Node: search
    # ─────────────────────────────────────────────────────────────────────

    @staticmethod
    def _search_all(queries: list[str]) -> list[dict]:
        """Run every query through the existing search chain, dedupe by URL."""
        from app.services.market_service import MarketService

        seen_urls: set[str] = set()
        results: list[dict] = []

        for query in queries:
            try:
                hits = MarketService.search(query, max_results=RESULTS_PER_QUERY)
            except Exception as e:
                logger.warning(f"[IdeaWatcher] Search failed for '{query}': {e}")
                continue

            for hit in IdeaWatcherService._normalize_hits(hits):
                url = hit.get("url", "")
                if not url or url in seen_urls:
                    continue
                seen_urls.add(url)
                hit["query"] = query
                results.append(hit)

        return results

    @staticmethod
    def _normalize_hits(hits) -> list[dict]:
        """MarketService returns different shapes per provider — flatten them."""
        if not hits:
            return []
        if isinstance(hits, dict):
            hits = hits.get("results") or hits.get("data") or []
        if not isinstance(hits, list):
            return []

        out = []
        for h in hits:
            if not isinstance(h, dict):
                continue
            out.append({
                "title": (h.get("title") or h.get("name") or "").strip(),
                "url": (h.get("url") or h.get("link") or "").strip(),
                "snippet": (
                    h.get("content") or h.get("snippet") or h.get("description") or ""
                ).strip()[:600],
            })
        return [o for o in out if o["title"] and o["url"]]

    # ─────────────────────────────────────────────────────────────────────
    # Node: score relevance + filter
    # ─────────────────────────────────────────────────────────────────────

    @staticmethod
    def _score_and_filter(idea: dict, results: list[dict]) -> list[dict]:
        """Score each result 0-10 against the idea; keep the strongest few."""
        from app.services.gemini_service import GeminiService

        # Cap what we send to the model to keep the prompt (and cost) bounded
        candidates = results[:20]
        listing = "\n".join(
            f'{i}. {r["title"]} — {r["snippet"][:200]}'
            for i, r in enumerate(candidates)
        )

        prompt = f"""Startup: {idea.get('title', '')}
Industry: {idea.get('industry') or 'technology'}
Problem: {(idea.get('problem') or idea.get('description') or '')[:400]}

Below are web search results. Score each 0-10 for how much this founder needs to
know about it THIS WEEK. Score high only for genuine signal: a new competitor,
funding in their space, regulation, or a real market shift. Score low for generic
listicles, old news, or unrelated content.

Results:
{listing}

Return JSON only:
{{"scores": [{{"index": 0, "score": 8, "why": "one short sentence on why it matters to this founder"}}]}}
Include every index."""

        scored: list[dict] = []
        try:
            res = GeminiService.call_gemini(prompt, stage="idea_watcher_scoring")
            if res.get("success") and isinstance(res.get("data"), dict):
                for entry in res["data"].get("scores", []):
                    try:
                        idx = int(entry.get("index", -1))
                        score = float(entry.get("score", 0))
                    except (TypeError, ValueError):
                        continue
                    if 0 <= idx < len(candidates) and score >= RELEVANCE_THRESHOLD:
                        item = dict(candidates[idx])
                        item["score"] = round(score, 1)
                        item["why"] = str(entry.get("why", "")).strip()[:300]
                        scored.append(item)
        except Exception as e:
            logger.warning(f"[IdeaWatcher] Scoring failed, falling back to top results: {e}")

        if not scored:
            # Model unavailable — degrade to the first few results rather than
            # sending nothing. Marked so the digest can stay honest about it.
            scored = [
                {**r, "score": 0, "why": "", "unscored": True}
                for r in candidates[:3]
            ]

        scored.sort(key=lambda r: r.get("score", 0), reverse=True)
        return scored[:MAX_FINDINGS]

    # ─────────────────────────────────────────────────────────────────────
    # Node: synthesize
    # ─────────────────────────────────────────────────────────────────────

    @staticmethod
    def _synthesize(idea: dict, findings: list[dict]) -> dict:
        """Write the digest: a subject line, a short intro, and a takeaway."""
        from app.services.gemini_service import GeminiService

        bullets = "\n".join(
            f'- {f["title"]}: {f["snippet"][:200]}' for f in findings
        )

        prompt = f"""You write a weekly intelligence digest for a startup founder.

Their startup: {idea.get('title', '')}
Industry: {idea.get('industry') or 'technology'}

This week's findings:
{bullets}

Write:
1. "subject" — an email subject line under 60 characters. Concrete and specific.
   No emoji. No clickbait.
2. "intro" — one sentence introducing the week's findings.
3. "takeaway" — 2-3 sentences on what this means for THIS founder specifically
   and what they should consider doing. Be direct and practical, not generic.

Return JSON only: {{"subject": "...", "intro": "...", "takeaway": "..."}}"""

        try:
            res = GeminiService.call_gemini(prompt, stage="idea_watcher_synthesis")
            if res.get("success") and isinstance(res.get("data"), dict):
                data = res["data"]
                subject = str(data.get("subject", "")).strip()
                intro = str(data.get("intro", "")).strip()
                takeaway = str(data.get("takeaway", "")).strip()
                if subject and takeaway:
                    return {
                        "subject": subject[:120],
                        "intro": intro[:400],
                        "takeaway": takeaway[:1200],
                    }
        except Exception as e:
            logger.warning(f"[IdeaWatcher] Synthesis failed, using fallback copy: {e}")

        count = len(findings)
        title = idea.get("title", "your idea")
        return {
            "subject": f"{count} update{'s' if count != 1 else ''} on {title}",
            "intro": f"Here's what moved in your space this week.",
            "takeaway": "Review the sources below and note anything that changes your positioning or timeline.",
        }

    # ─────────────────────────────────────────────────────────────────────
    # Node: deliver — persistence, email, notification
    # ─────────────────────────────────────────────────────────────────────

    @staticmethod
    def _persist_digest(db, idea, findings, digest, agent_run_id, trigger) -> int:
        digest_id = IdeaWatcherService._next_id(db, "idea_watcher_runs")
        db.idea_watcher_runs.insert_one({
            "id": digest_id,
            "idea_id": idea["id"],
            "user_id": idea.get("user_id"),
            "agent_run_id": agent_run_id,
            "trigger": trigger,
            "subject": digest["subject"],
            "intro": digest["intro"],
            "takeaway": digest["takeaway"],
            "findings": findings,
            "email_sent": False,
            "cost_usd": ESTIMATED_COST_USD,
            "created_at": datetime.utcnow(),
        })
        return digest_id

    @staticmethod
    def _send_digest_email(recipient, user, idea, findings, digest) -> bool:
        from app.services.email_service import EmailService

        html = IdeaWatcherService._render_email(user, idea, findings, digest)
        try:
            ok, msg = EmailService.send_email(recipient, digest["subject"], html)
            if not ok:
                logger.warning(f"[IdeaWatcher] Email not sent to {recipient}: {msg}")
            return bool(ok)
        except Exception as e:
            logger.warning(f"[IdeaWatcher] Email error for {recipient}: {e}")
            return False

    @staticmethod
    def _render_email(user, idea, findings, digest) -> str:
        """Digest email — brand-matched, and readable in every mail client."""
        frontend = IdeaWatcherService._frontend_url()
        first_name = (user.get("first_name") or "there").strip()
        idea_title = idea.get("title", "your idea")
        idea_url = f"{frontend}/dashboard/idea/{idea['id']}/watcher"

        rows = []
        for f in findings:
            score_pill = ""
            if not f.get("unscored") and f.get("score"):
                score_pill = (
                    f'<span style="display:inline-block;margin-left:8px;padding:2px 8px;'
                    f'border-radius:99px;background:#eef2ff;color:#4338ca;font-size:11px;'
                    f'font-weight:600;">{f["score"]}/10</span>'
                )
            why = ""
            if f.get("why"):
                why = (
                    f'<p style="margin:6px 0 0;color:#4b5563;font-size:13px;'
                    f'line-height:1.55;"><strong style="color:#4338ca;">Why it matters:</strong> '
                    f'{IdeaWatcherService._esc(f["why"])}</p>'
                )
            rows.append(f"""
              <tr><td style="padding:0 0 18px;">
                <div style="border:1px solid #e5e7eb;border-radius:10px;padding:16px;background:#ffffff;">
                  <a href="{IdeaWatcherService._esc(f['url'])}"
                     style="color:#111827;font-size:15px;font-weight:600;text-decoration:none;line-height:1.4;">
                    {IdeaWatcherService._esc(f['title'])}</a>{score_pill}
                  <p style="margin:8px 0 0;color:#6b7280;font-size:13px;line-height:1.55;">
                    {IdeaWatcherService._esc(f['snippet'][:220])}</p>
                  {why}
                  <a href="{IdeaWatcherService._esc(f['url'])}"
                     style="display:inline-block;margin-top:10px;color:#6366f1;font-size:12px;
                            font-weight:600;text-decoration:none;">Read source &rarr;</a>
                </div>
              </td></tr>""")

        return f"""<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f3f4f6;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:28px 12px;">
<tr><td align="center">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">

    <tr><td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:26px 28px;border-radius:12px 12px 0 0;">
      <h1 style="color:#ffffff;margin:0;font-size:20px;font-weight:600;letter-spacing:-0.01em;">Inceptrax</h1>
      <p style="color:rgba(255,255,255,0.82);margin:4px 0 0;font-size:13px;">Idea Watcher &middot; weekly digest</p>
    </td></tr>

    <tr><td style="background:#ffffff;padding:26px 28px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
      <p style="margin:0 0 4px;color:#111827;font-size:15px;">Hi {IdeaWatcherService._esc(first_name)},</p>
      <p style="margin:0 0 4px;color:#6b7280;font-size:13px;">Watching: <strong style="color:#4338ca;">{IdeaWatcherService._esc(idea_title)}</strong></p>
      <p style="margin:14px 0 0;color:#374151;font-size:14px;line-height:1.6;">{IdeaWatcherService._esc(digest['intro'])}</p>
    </td></tr>

    <tr><td style="background:#f9fafb;padding:22px 28px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
      <p style="margin:0 0 14px;color:#6b7280;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.12em;">
        {len(findings)} finding{'s' if len(findings) != 1 else ''} this week</p>
      <table width="100%" cellpadding="0" cellspacing="0">{''.join(rows)}</table>
    </td></tr>

    <tr><td style="background:#ffffff;padding:22px 28px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
      <div style="border-left:3px solid #6366f1;padding-left:14px;">
        <p style="margin:0 0 6px;color:#4338ca;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.12em;">What this means for you</p>
        <p style="margin:0;color:#374151;font-size:14px;line-height:1.65;">{IdeaWatcherService._esc(digest['takeaway'])}</p>
      </div>
      <a href="{idea_url}" style="display:inline-block;margin-top:20px;background:#6366f1;color:#ffffff;
         padding:11px 22px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;">
        Open in Inceptrax</a>
    </td></tr>

    <tr><td style="background:#ffffff;padding:18px 28px 24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
      <p style="margin:0;color:#9ca3af;font-size:11px;line-height:1.6;">
        You're receiving this because Idea Watcher is on for this idea.
        <a href="{frontend}/dashboard/idea/{idea['id']}/watcher" style="color:#6366f1;text-decoration:none;">Manage or turn it off</a>.
      </p>
    </td></tr>

  </table>
</td></tr></table>
</body></html>"""

    @staticmethod
    def _notify_in_app(db, idea, findings, digest):
        """Drop an in-app notification so the digest is visible without email."""
        try:
            notif_id = IdeaWatcherService._next_id(db, "notifications")
            db.notifications.insert_one({
                "id": notif_id,
                "user_id": idea.get("user_id"),
                "title": "Idea Watcher digest ready",
                "message": f"{len(findings)} new finding{'s' if len(findings) != 1 else ''} for \"{idea.get('title', '')}\".",
                "type": "agent",
                "link": f"/dashboard/idea/{idea['id']}/watcher",
                "is_read": False,
                "created_at": datetime.utcnow(),
            })
        except Exception as e:
            logger.warning(f"[IdeaWatcher] Notification insert failed: {e}")

    # ─────────────────────────────────────────────────────────────────────
    # Scheduling helpers
    # ─────────────────────────────────────────────────────────────────────

    @staticmethod
    def due_idea_ids(db) -> list[int]:
        """
        Ideas whose watcher should run on this weekly tick.

        Watching is on by default (spec §6.2), so an idea with no settings row
        counts as enabled. Paused ideas and non-paying tiers are skipped.
        """
        paid_user_ids = [
            u["id"] for u in db.users.find(
                {"subscription_tier": {"$in": ["pro", "team"]}}, {"id": 1}
            )
        ]
        if not paid_user_ids:
            return []

        now = datetime.utcnow()
        due: list[int] = []

        for idea in db.ideas.find(
            {"user_id": {"$in": paid_user_ids}, "status": "completed"},
            {"id": 1},
        ):
            idea_id = idea["id"]
            s = db.idea_watcher_settings.find_one({"idea_id": idea_id}) or {}

            if s.get("enabled") is False:
                continue
            paused_until = s.get("paused_until")
            if paused_until and paused_until > now:
                continue
            if s.get("frequency") == "monthly":
                last = s.get("last_run_at")
                if last and (now - last) < timedelta(days=28):
                    continue

            due.append(idea_id)

        return due

    @staticmethod
    def manual_run_blocked_until(db, idea_id: int):
        """Return the datetime a manual run becomes allowed again, or None."""
        last = db.agent_runs.find_one(
            {"agent_type": AGENT_TYPE, "idea_id": idea_id, "trigger": "manual"},
            sort=[("started_at", -1)],
        )
        if not last or not last.get("started_at"):
            return None
        ready_at = last["started_at"] + timedelta(minutes=MANUAL_COOLDOWN_MINUTES)
        return ready_at if ready_at > datetime.utcnow() else None

    @staticmethod
    def _touch_settings(db, idea_id: int):
        db.idea_watcher_settings.update_one(
            {"idea_id": idea_id},
            {"$set": {"last_run_at": datetime.utcnow()}},
            upsert=True,
        )

    # ─────────────────────────────────────────────────────────────────────
    # agent_runs bookkeeping
    # ─────────────────────────────────────────────────────────────────────

    @staticmethod
    def _open_run(db, idea_id, trigger, run_id) -> int:
        idea = db.ideas.find_one({"id": idea_id}, {"user_id": 1}) or {}
        agent_run_id = IdeaWatcherService._next_id(db, "agent_runs")
        db.agent_runs.insert_one({
            "id": agent_run_id,
            "agent_type": AGENT_TYPE,
            "user_id": idea.get("user_id"),
            "idea_id": idea_id,
            "run_id": run_id,
            "trigger": trigger,
            "state": {},
            "current_node": "start",
            "status": "running",
            "result": None,
            "error": None,
            "started_at": datetime.utcnow(),
            "completed_at": None,
        })
        return agent_run_id

    @staticmethod
    def _node(db, agent_run_id, node: str):
        db.agent_runs.update_one(
            {"id": agent_run_id},
            {"$set": {"current_node": node, "updated_at": datetime.utcnow()}},
        )

    @staticmethod
    def _finish(db, agent_run_id, status, result=None, error=None, idea_id=None) -> dict:
        db.agent_runs.update_one(
            {"id": agent_run_id},
            {"$set": {
                "status": status,
                "result": result,
                "error": error,
                "current_node": "end",
                "cost_usd": ESTIMATED_COST_USD if status == "complete" else 0,
                "completed_at": datetime.utcnow(),
            }},
        )
        return {
            "agent_run_id": agent_run_id,
            "idea_id": idea_id,
            "status": status,
            "error": error,
            **(result or {}),
        }

    # ─────────────────────────────────────────────────────────────────────
    # Small utilities
    # ─────────────────────────────────────────────────────────────────────

    @staticmethod
    def _next_id(db, collection_name: str) -> int:
        counter = db.counters.find_one_and_update(
            {"_id": collection_name},
            {"$inc": {"seq": 1}},
            upsert=True,
            return_document=True,
        )
        return counter["seq"]

    @staticmethod
    def _frontend_url() -> str:
        import os
        return os.environ.get("FRONTEND_URL", "https://www.inceptrax.com").rstrip("/")

    @staticmethod
    def _esc(text) -> str:
        """Escape user/model/web text before it enters the email HTML."""
        import html
        return html.escape(str(text or ""), quote=True)
