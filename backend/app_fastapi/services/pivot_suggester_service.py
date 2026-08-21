"""
Pivot Suggester — Agent #4 (Phase 2 spec §6.5)

Event-driven rather than scheduled. It wakes when another agent finds something
that might change the founder's strategy — a well-funded competitor appearing,
a market shift in an Idea Watcher digest — or when the founder explicitly asks
"should I pivot?".

Design note: this agent is allowed to say "stay the course". An advisor that
always recommends action is worthless, and a pivot suggested on thin evidence
costs a founder months. The prompt is written to make holding a first-class
answer, and the recommendation records its own confidence.
"""

import logging
from datetime import datetime, timedelta

from app_fastapi.services.agent_base import (
    AgentRun, esc, frontend_url, next_id, notify, send_agent_email,
)

logger = logging.getLogger(__name__)

AGENT_TYPE = "pivot_suggester"
COST_USD = 0.025          # spec §6.5
COOLDOWN_DAYS = 7         # at most one suggestion per idea per week
MAX_OPTIONS = 4


class PivotSuggesterService:

    @staticmethod
    def run(idea_id: int, trigger: str = "manual", reason: str = "") -> dict:
        """Assess whether this idea should change direction."""
        from app import get_db

        db = get_db()

        with AgentRun(AGENT_TYPE, idea_id=idea_id, trigger=trigger, cost_usd=COST_USD) as run:
            run.node("gather_context")
            idea = db.ideas.find_one({"id": idea_id})
            if not idea:
                run.finish(result={"error": "idea_not_found"}, status="failed")
                return {"status": "failed", "error": "idea not found"}

            context = PivotSuggesterService._gather(db, idea)

            run.node("assess")
            assessment = PivotSuggesterService._assess(idea, context, reason)
            if not assessment:
                run.finish(result={"error": "assessment_failed"}, status="failed")
                return {"status": "failed", "error": "assessment failed"}

            run.node("persist")
            suggestion_id = next_id(db, "pivot_suggestions")
            db.pivot_suggestions.insert_one({
                "id": suggestion_id,
                "idea_id": idea_id,
                "user_id": idea.get("user_id"),
                "agent_run_id": run.id,
                "trigger": trigger,
                "trigger_reason": reason,
                "recommendation": assessment["recommendation"],   # "pivot" | "hold"
                "confidence": assessment["confidence"],
                "rationale": assessment["rationale"],
                "options": assessment["options"],
                "signals_used": context["signals"],
                "cost_usd": COST_USD,
                "created_at": datetime.utcnow(),
            })

            run.node("notify")
            user = db.users.find_one({"id": idea.get("user_id")}) or {}
            link = f"/dashboard/idea/{idea_id}/pivot"
            headline = (
                "A pivot is worth considering"
                if assessment["recommendation"] == "pivot"
                else "Stay the course"
            )

            sent = False
            if user.get("email"):
                sent = PivotSuggesterService._email(
                    user, idea, assessment, headline, link
                )

            notify(
                db, idea.get("user_id"),
                f"Pivot check: {headline.lower()}",
                assessment["rationale"][:160],
                link,
            )

            run.finish(result={
                "suggestion_id": suggestion_id,
                "recommendation": assessment["recommendation"],
                "confidence": assessment["confidence"],
                "email_sent": sent,
            })
            return {
                "status": "complete",
                "suggestion_id": suggestion_id,
                "recommendation": assessment["recommendation"],
                "email_sent": sent,
            }

    # ── Context ───────────────────────────────────────────────────────────

    @staticmethod
    def _gather(db, idea: dict) -> dict:
        """Pull what the other agents have learned about this idea."""
        idea_id = idea["id"]
        signals = []

        digests = list(
            db.idea_watcher_runs.find({"idea_id": idea_id})
            .sort("created_at", -1).limit(3)
        )
        findings = []
        for d in digests:
            signals.append(f"idea_watcher_digest#{d.get('id')}")
            for f in (d.get("findings") or [])[:4]:
                findings.append({
                    "title": f.get("title", ""),
                    "why": f.get("why", ""),
                    "score": f.get("score"),
                })

        alerts = list(
            db.competitor_alerts.find({"idea_id": idea_id})
            .sort("created_at", -1).limit(5)
        ) if "competitor_alerts" in db.list_collection_names() else []
        for a in alerts:
            signals.append(f"competitor_alert#{a.get('id')}")

        return {
            "findings": findings[:8],
            "alerts": [
                {"title": a.get("title", ""), "summary": str(a.get("summary", ""))[:200]}
                for a in alerts
            ],
            "signals": signals,
        }

    # ── Assessment ────────────────────────────────────────────────────────

    @staticmethod
    def _assess(idea: dict, context: dict, reason: str):
        from app.services.gemini_service import GeminiService

        findings_text = "\n".join(
            f"- {f['title']} ({f.get('score', '?')}/10): {f['why']}"
            for f in context["findings"]
        ) or "No recent market findings."

        alerts_text = "\n".join(
            f"- {a['title']}: {a['summary']}" for a in context["alerts"]
        ) or "No competitor alerts."

        prompt = f"""You advise a startup founder on whether to change direction.

THEIR STARTUP
Title: {idea.get('title', '')}
Problem: {(idea.get('problem') or idea.get('description') or '')[:600]}
Solution: {(idea.get('solution') or '')[:400]}
Audience: {idea.get('audience') or 'unspecified'}
Industry: {idea.get('industry') or 'unspecified'}
Validation score: {idea.get('overall_score', 'not scored')}

WHY THIS CHECK WAS TRIGGERED
{reason or 'The founder asked directly.'}

RECENT MARKET FINDINGS
{findings_text}

COMPETITOR ALERTS
{alerts_text}

Decide honestly whether they should pivot or hold.

Rules you must follow:
- "hold" is a legitimate and often correct answer. Recommend it when the
  evidence is thin, or when the right response is to execute better rather
  than change direction.
- Only recommend "pivot" when the evidence genuinely undermines the current
  premise — not merely because competitors exist. Competition usually
  validates a market.
- Every pivot option must be a realistic adjacent move from where they already
  are, not an unrelated new business.
- Be concrete. No generic startup advice.

Return JSON only:
{{
  "recommendation": "pivot" or "hold",
  "confidence": "high" or "medium" or "low",
  "rationale": "2-3 sentences explaining the decision, referencing the evidence",
  "options": [
    {{
      "direction": "short name for the pivot",
      "what_changes": "one sentence on what would actually change",
      "why_now": "the evidence that supports it",
      "feasibility": 1-10,
      "market_size": 1-10,
      "founder_fit": 1-10,
      "time_to_pivot": "e.g. 2 weeks / 2 months"
    }}
  ]
}}
If recommending "hold", return an empty options array and explain in rationale
what to focus on instead."""

        try:
            res = GeminiService.call_gemini(prompt, stage="pivot_suggester")
            if res.get("success") and isinstance(res.get("data"), dict):
                d = res["data"]
                rec = str(d.get("recommendation", "hold")).lower()
                if rec not in ("pivot", "hold"):
                    rec = "hold"
                options = d.get("options") or []
                if not isinstance(options, list):
                    options = []
                return {
                    "recommendation": rec,
                    "confidence": str(d.get("confidence", "low")).lower(),
                    "rationale": str(d.get("rationale", "")).strip()[:1200],
                    "options": options[:MAX_OPTIONS],
                }
        except Exception as e:
            logger.warning("[PivotSuggester] assessment failed: %s", e)
        return None

    # ── Email ─────────────────────────────────────────────────────────────

    @staticmethod
    def _email(user, idea, assessment, headline, link) -> bool:
        rows = ""
        for o in assessment["options"]:
            rows += f"""
            <div style="border:1px solid #e5e7eb;border-radius:10px;padding:14px;margin-bottom:10px;">
              <p style="margin:0;font-size:15px;font-weight:600;color:#111827;">{esc(o.get('direction',''))}</p>
              <p style="margin:6px 0 0;font-size:13px;color:#4b5563;line-height:1.55;">{esc(o.get('what_changes',''))}</p>
              <p style="margin:8px 0 0;font-size:12px;color:#6b7280;">
                Feasibility {esc(o.get('feasibility','?'))}/10 &middot;
                Market {esc(o.get('market_size','?'))}/10 &middot;
                Fit {esc(o.get('founder_fit','?'))}/10 &middot;
                {esc(o.get('time_to_pivot',''))}
              </p>
            </div>"""

        body = f"""
        <p style="margin:0 0 6px;color:#6b7280;font-size:13px;">Watching:
          <strong style="color:#4338ca;">{esc(idea.get('title',''))}</strong></p>
        <p style="margin:14px 0 0;font-size:17px;font-weight:600;color:#111827;">{esc(headline)}</p>
        <p style="margin:8px 0 0;color:#374151;font-size:14px;line-height:1.65;">{esc(assessment['rationale'])}</p>
        <p style="margin:14px 0 4px;color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:0.12em;">
          Confidence: {esc(assessment['confidence'])}</p>
        {('<div style="margin-top:14px;">' + rows + '</div>') if rows else ''}"""

        return send_agent_email(
            to=user["email"],
            subject=f"Pivot check: {headline}",
            heading="Pivot Suggester",
            body_html=body,
            cta_label="See the full analysis",
            cta_url=frontend_url() + link,
        )

    # ── Trigger guard ─────────────────────────────────────────────────────

    @staticmethod
    def should_trigger(db, idea_id: int) -> bool:
        """
        Event-driven agents can fire repeatedly if upstream signals cluster.
        One suggestion per idea per week is plenty — more than that and the
        founder stops reading them.
        """
        cutoff = datetime.utcnow() - timedelta(days=COOLDOWN_DAYS)
        recent = db.pivot_suggestions.find_one({
            "idea_id": idea_id,
            "created_at": {"$gt": cutoff},
        })
        return recent is None
