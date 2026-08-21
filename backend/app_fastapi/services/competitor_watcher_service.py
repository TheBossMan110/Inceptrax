"""
Competitor Watcher v2 — Agent #2 (Phase 2 spec §6.3)

The v1 scanner (app/services/competitor_monitoring_service.py) matches keywords
against news results and scores by word overlap. It still runs and is untouched;
this is the agent layer on top of it.

What v2 adds:
  - the model identifies actual *companies*, instead of matching keywords
  - each competitor gets a positioning summary, not just a headline
  - threat is scored 0-10 against this specific idea, not generic relevance
  - snapshots are hashed so week-over-week *changes* are detectable
  - only meaningful threats reach the founder
  - a high threat emits agent/high-threat-competitor, which wakes the
    Pivot Suggester — the two agents form a loop

State machine:
    [load_known] -> [discover] -> [deep_dive] -> [score_threat]
        -> [detect_changes] -> [prioritize] -> [notify] -> [persist]
"""

import hashlib
import logging
from datetime import datetime

from app_fastapi.services.agent_base import (
    AgentRun, esc, frontend_url, next_id, notify, send_agent_email,
)

logger = logging.getLogger(__name__)

AGENT_TYPE = "competitor_watcher"
COST_USD = 0.015              # spec §6.3
ALERT_THRESHOLD = 6           # only surface threats at or above this
PIVOT_TRIGGER_THRESHOLD = 8   # above this, ask whether the premise still holds
MAX_COMPETITORS = 6
MAX_DEEP_DIVES = 3            # Firecrawl calls are the expensive part


class CompetitorWatcherService:

    @staticmethod
    def run(idea_id: int, trigger: str = "cron") -> dict:
        from app import get_db

        db = get_db()

        with AgentRun(AGENT_TYPE, idea_id=idea_id, trigger=trigger, cost_usd=COST_USD) as run:
            idea = db.ideas.find_one({"id": idea_id})
            if not idea:
                run.finish(result={"error": "idea_not_found"}, status="failed")
                return {"status": "failed", "error": "idea not found"}

            run.node("load_known")
            known = CompetitorWatcherService._load_known(db, idea_id)

            run.node("discover")
            discovered = CompetitorWatcherService._discover(idea)
            if not discovered:
                run.finish(result={"competitors": 0, "reason": "none_found"})
                return {"status": "complete", "competitors": 0, "alerts": 0}

            run.node("deep_dive")
            enriched = CompetitorWatcherService._deep_dive(discovered)

            run.node("score_threat")
            scored = CompetitorWatcherService._score_threats(idea, enriched)

            run.node("detect_changes")
            changes = CompetitorWatcherService._diff_against_snapshots(known, scored)

            run.node("persist")
            CompetitorWatcherService._save_snapshots(db, idea_id, scored)

            run.node("prioritize")
            alerts = [c for c in scored if c.get("threat_score", 0) >= ALERT_THRESHOLD]
            alerts.sort(key=lambda c: c.get("threat_score", 0), reverse=True)

            run.node("notify")
            sent = False
            if alerts or changes:
                sent = CompetitorWatcherService._notify(db, idea, alerts, changes)

            top = alerts[0]["threat_score"] if alerts else 0
            result = {
                "competitors": len(scored),
                "alerts": len(alerts),
                "changes": len(changes),
                "top_threat": top,
                "email_sent": sent,
            }
            run.finish(result=result)
            return {"status": "complete", **result}

    # ── Known competitors ─────────────────────────────────────────────────

    @staticmethod
    def _load_known(db, idea_id: int) -> dict:
        """Latest snapshot per competitor, keyed by normalised name."""
        known = {}
        for snap in db.competitor_snapshots.find({"idea_id": idea_id}).sort("snapshot_date", -1):
            key = (snap.get("competitor_name") or "").strip().lower()
            if key and key not in known:
                known[key] = snap
        return known

    # ── Discover ──────────────────────────────────────────────────────────

    @staticmethod
    def _discover(idea: dict) -> list[dict]:
        """Search the space, then let the model name the actual companies."""
        from app.services.market_service import MarketService
        from app.services.gemini_service import GeminiService

        title = idea.get("title", "")
        industry = idea.get("industry") or "technology"
        problem = (idea.get("problem") or idea.get("description") or "")[:400]

        queries = [
            f"{title} competitors",
            f"{industry} startups funding",
            f"best tools for {industry}",
        ]

        raw = []
        seen = set()
        for q in queries:
            try:
                hits = MarketService.search(q, max_results=5)
            except Exception as e:
                logger.warning("[CompetitorWatcher] search failed for %s: %s", q, e)
                continue
            if isinstance(hits, dict):
                hits = hits.get("results") or hits.get("data") or []
            for h in hits or []:
                if not isinstance(h, dict):
                    continue
                url = (h.get("url") or h.get("link") or "").strip()
                if not url or url in seen:
                    continue
                seen.add(url)
                raw.append({
                    "title": (h.get("title") or "").strip(),
                    "url": url,
                    "snippet": (h.get("content") or h.get("snippet") or "")[:400],
                })

        if not raw:
            return []

        listing = "\n".join(f'{i}. {r["title"]} — {r["snippet"][:160]} [{r["url"]}]'
                            for i, r in enumerate(raw[:18]))

        prompt = f"""Identify real COMPANIES competing with this startup.

STARTUP
Title: {title}
Problem it solves: {problem}
Industry: {industry}

SEARCH RESULTS
{listing}

Extract only actual companies or products that compete. Ignore blog posts,
listicles, directories, and news outlets — name the companies they mention
instead of the article. If a result is a "top 10 tools" article, extract the
tools it names, not the article.

Return JSON only:
{{"competitors": [
  {{"name": "Company", "url": "https://...", "what_they_do": "one sentence"}}
]}}
Maximum {MAX_COMPETITORS}. If none are real competitors, return an empty list."""

        try:
            res = GeminiService.call_gemini(prompt, stage="competitor_discovery")
            if res.get("success") and isinstance(res.get("data"), dict):
                out = []
                for c in (res["data"].get("competitors") or [])[:MAX_COMPETITORS]:
                    name = str(c.get("name", "")).strip()
                    if not name:
                        continue
                    out.append({
                        "name": name,
                        "url": str(c.get("url", "")).strip(),
                        "what_they_do": str(c.get("what_they_do", "")).strip()[:300],
                    })
                return out
        except Exception as e:
            logger.warning("[CompetitorWatcher] discovery failed: %s", e)
        return []

    # ── Deep dive ─────────────────────────────────────────────────────────

    @staticmethod
    def _deep_dive(competitors: list[dict]) -> list[dict]:
        """
        Fetch each competitor's page for positioning and a change hash.

        Only the first few are fetched — scraping is the expensive part, and
        the ranked-first competitors are the ones that matter.
        """
        from app.services.market_service import MarketService

        for i, c in enumerate(competitors):
            if i >= MAX_DEEP_DIVES or not c.get("url"):
                c["page_text"] = ""
                c["content_hash"] = ""
                continue
            try:
                content = MarketService.scrape_url(c["url"])
                text = ""
                if isinstance(content, str):
                    text = content
                elif isinstance(content, dict):
                    text = content.get("content") or content.get("markdown") or ""
                text = (text or "").strip()[:4000]
                c["page_text"] = text
                # Hash the content so next week's run can spot a real change
                # (pricing, positioning, a launch) rather than re-alerting.
                c["content_hash"] = (
                    hashlib.sha256(text.encode("utf-8", "ignore")).hexdigest()
                    if text else ""
                )
            except Exception as e:
                logger.warning("[CompetitorWatcher] scrape failed for %s: %s", c.get("url"), e)
                c["page_text"] = ""
                c["content_hash"] = ""
        return competitors

    # ── Threat scoring ────────────────────────────────────────────────────

    @staticmethod
    def _score_threats(idea: dict, competitors: list[dict]) -> list[dict]:
        from app.services.gemini_service import GeminiService

        listing = "\n".join(
            f'{i}. {c["name"]}: {c.get("what_they_do","")} '
            f'{("| site says: " + c["page_text"][:300]) if c.get("page_text") else ""}'
            for i, c in enumerate(competitors)
        )

        prompt = f"""Score how much each competitor threatens this specific startup.

STARTUP
Title: {idea.get('title','')}
Problem: {(idea.get('problem') or idea.get('description') or '')[:400]}
Audience: {idea.get('audience') or 'unspecified'}
Industry: {idea.get('industry') or 'unspecified'}

COMPETITORS
{listing}

Score 0-10 where:
  0-3  adjacent, different audience or problem
  4-5  overlapping but differentiated
  6-7  direct competitor serving the same need
  8-10 direct competitor with clear advantages (funding, distribution, maturity)

Judge threat to THIS startup's specific audience and positioning — a large
company serving a different segment is a low threat, not a high one.

Return JSON only:
{{"scores": [
  {{"index": 0, "threat_score": 7, "positioning": "how they position themselves",
    "why_threat": "one sentence specific to this founder",
    "their_weakness": "a gap this founder could exploit"}}
]}}
Include every index."""

        try:
            res = GeminiService.call_gemini(prompt, stage="competitor_threat")
            if res.get("success") and isinstance(res.get("data"), dict):
                by_index = {}
                for s in res["data"].get("scores", []):
                    try:
                        by_index[int(s.get("index", -1))] = s
                    except (TypeError, ValueError):
                        continue
                for i, c in enumerate(competitors):
                    s = by_index.get(i, {})
                    try:
                        c["threat_score"] = max(0, min(10, float(s.get("threat_score", 0))))
                    except (TypeError, ValueError):
                        c["threat_score"] = 0
                    c["positioning"] = str(s.get("positioning", ""))[:300]
                    c["why_threat"] = str(s.get("why_threat", ""))[:300]
                    c["their_weakness"] = str(s.get("their_weakness", ""))[:300]
                return competitors
        except Exception as e:
            logger.warning("[CompetitorWatcher] threat scoring failed: %s", e)

        for c in competitors:
            c.setdefault("threat_score", 0)
            c.setdefault("positioning", "")
            c.setdefault("why_threat", "")
            c.setdefault("their_weakness", "")
        return competitors

    # ── Change detection ──────────────────────────────────────────────────

    @staticmethod
    def _diff_against_snapshots(known: dict, scored: list[dict]) -> list[dict]:
        """
        Week-over-week diff. A competitor already seen only becomes news when
        their page actually changed or their threat level moved — otherwise
        the founder gets the same alert every week and stops reading.
        """
        changes = []
        for c in scored:
            prev = known.get(c["name"].strip().lower())
            if not prev:
                c["is_new"] = True
                continue
            c["is_new"] = False

            prev_hash = prev.get("content_hash") or ""
            prev_threat = prev.get("threat_score") or 0

            if c.get("content_hash") and prev_hash and c["content_hash"] != prev_hash:
                changes.append({
                    "name": c["name"],
                    "kind": "site_changed",
                    "detail": "Their site content changed since the last check.",
                    "threat_score": c.get("threat_score", 0),
                })
            if c.get("threat_score", 0) - prev_threat >= 2:
                changes.append({
                    "name": c["name"],
                    "kind": "threat_increased",
                    "detail": f"Threat rose from {prev_threat} to {c.get('threat_score')}.",
                    "threat_score": c.get("threat_score", 0),
                })
        return changes

    @staticmethod
    def _save_snapshots(db, idea_id: int, scored: list[dict]):
        now = datetime.utcnow()
        for c in scored:
            db.competitor_snapshots.insert_one({
                "id": next_id(db, "competitor_snapshots"),
                "idea_id": idea_id,
                "competitor_name": c["name"],
                "url": c.get("url", ""),
                "snapshot_date": now,
                "content_hash": c.get("content_hash", ""),
                "summary": c.get("positioning") or c.get("what_they_do", ""),
                "threat_score": c.get("threat_score", 0),
                "why_threat": c.get("why_threat", ""),
                "their_weakness": c.get("their_weakness", ""),
            })

    # ── Notify ────────────────────────────────────────────────────────────

    @staticmethod
    def _notify(db, idea: dict, alerts: list[dict], changes: list[dict]) -> bool:
        user = db.users.find_one({"id": idea.get("user_id")}) or {}
        idea_id = idea["id"]
        link = f"/dashboard/idea/{idea_id}/competitor-watch"

        top = alerts[0] if alerts else None
        headline = (
            f"{len(alerts)} competitor{'s' if len(alerts) != 1 else ''} worth knowing about"
            if alerts else f"{len(changes)} competitor update{'s' if len(changes) != 1 else ''}"
        )

        notify(db, idea.get("user_id"), "Competitor Watch update",
               headline + f" for \"{idea.get('title','')}\".", link)

        # A genuinely strong competitor is a strategic question, not just an
        # alert — hand it to the Pivot Suggester.
        if top and top.get("threat_score", 0) >= PIVOT_TRIGGER_THRESHOLD:
            CompetitorWatcherService._emit_pivot_event(idea_id, top)

        if not user.get("email"):
            return False

        rows = ""
        for c in alerts[:5]:
            rows += f"""
            <div style="border:1px solid #e5e7eb;border-radius:10px;padding:14px;margin-bottom:10px;">
              <p style="margin:0;font-size:15px;font-weight:600;color:#111827;">
                {esc(c['name'])}
                <span style="margin-left:8px;padding:2px 8px;border-radius:99px;background:#fef2f2;
                             color:#b91c1c;font-size:11px;font-weight:600;">{esc(c.get('threat_score',0))}/10</span>
              </p>
              <p style="margin:6px 0 0;font-size:13px;color:#4b5563;line-height:1.55;">{esc(c.get('positioning',''))}</p>
              <p style="margin:8px 0 0;font-size:13px;color:#4b5563;line-height:1.55;">
                <strong style="color:#4338ca;">Why it matters:</strong> {esc(c.get('why_threat',''))}</p>
              <p style="margin:6px 0 0;font-size:13px;color:#047857;line-height:1.55;">
                <strong>Their gap:</strong> {esc(c.get('their_weakness',''))}</p>
            </div>"""

        for ch in changes[:4]:
            rows += f"""
            <div style="border-left:3px solid #f59e0b;padding:10px 14px;margin-bottom:10px;background:#fffbeb;">
              <p style="margin:0;font-size:14px;color:#92400e;">
                <strong>{esc(ch['name'])}</strong> — {esc(ch['detail'])}</p>
            </div>"""

        body = f"""
        <p style="margin:0 0 6px;color:#6b7280;font-size:13px;">Watching:
          <strong style="color:#4338ca;">{esc(idea.get('title',''))}</strong></p>
        <p style="margin:14px 0 16px;color:#374151;font-size:14px;line-height:1.65;">{esc(headline)}.</p>
        {rows}"""

        return send_agent_email(
            to=user["email"],
            subject=f"Competitor Watch: {headline}",
            heading="Competitor Watcher",
            body_html=body,
            cta_label="Open Competitor Watch",
            cta_url=frontend_url() + link,
        )

    @staticmethod
    def _emit_pivot_event(idea_id: int, competitor: dict):
        """Fire-and-forget event into Inngest; never block the scan on it."""
        try:
            import asyncio
            import inngest
            from app_fastapi.inngest_client import inngest_client

            detail = (
                f"{competitor['name']} scored {competitor.get('threat_score')}/10 as a threat. "
                f"{competitor.get('why_threat', '')}"
            )
            event = inngest.Event(
                name="agent/high-threat-competitor",
                data={"idea_id": idea_id, "detail": detail},
            )
            try:
                loop = asyncio.get_running_loop()
                loop.create_task(inngest_client.send(event))
            except RuntimeError:
                asyncio.run(inngest_client.send(event))
            logger.info("[CompetitorWatcher] emitted high-threat event for idea #%s", idea_id)
        except Exception as e:
            logger.warning("[CompetitorWatcher] could not emit pivot event: %s", e)

    # ── Scheduling ────────────────────────────────────────────────────────

    @staticmethod
    def due_idea_ids(db) -> list[int]:
        """Ideas with an active watch whose owner's tier includes this agent."""
        from app_fastapi.services.agent_base import agent_enabled_for

        due = []
        for watch in db.competitor_watch.find({"is_active": True}, {"idea_id": 1}):
            idea_id = watch.get("idea_id")
            if idea_id is None:
                continue
            idea = db.ideas.find_one({"id": idea_id}, {"user_id": 1})
            if not idea:
                continue
            if agent_enabled_for(db, idea["user_id"], AGENT_TYPE):
                due.append(idea_id)
        return due
