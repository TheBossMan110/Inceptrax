"""
Progress Coach — Agent #3 (Phase 2 spec §6.4)

Watches each founder's momentum and nudges when it stalls, celebrates when it
builds. Cheap to run, so it is available on every tier — engagement matters
more here than margin.

Deviation from the spec, deliberately: §6.4 monitors a `checklist_items`
collection. That feature does not exist in this codebase, so the coach reads
the momentum signals that DO exist — analyses completed, ideas left unfinished,
runs that failed, and how long since the founder last did anything. Same
purpose, real data.
"""

import logging
from datetime import datetime, timedelta

from app_fastapi.services.agent_base import (
    AgentRun, agent_enabled_for, esc, frontend_url, notify, send_agent_email,
)

logger = logging.getLogger(__name__)

AGENT_TYPE = "progress_coach"
STALE_DAYS = 7          # no activity for this long -> nudge
CELEBRATE_WINDOW = 7    # completions inside this window -> encouragement
COST_USD = 0.005        # spec §6.4


class ProgressCoachService:

    @staticmethod
    def run(user_id: int, trigger: str = "cron") -> dict:
        """One coaching pass for a single founder."""
        from app import get_db

        db = get_db()
        with AgentRun(AGENT_TYPE, user_id=user_id, trigger=trigger, cost_usd=COST_USD) as run:
            run.node("gather_signals")
            signals = ProgressCoachService._gather(db, user_id)

            if not signals["ideas_total"]:
                run.finish(result={"skipped": "no_ideas"})
                return {"status": "skipped", "reason": "no_ideas"}

            run.node("decide")
            decision = ProgressCoachService._decide(signals)
            if not decision:
                run.finish(result={"action": "none", "reason": "healthy_no_nudge_needed"})
                return {"status": "complete", "action": "none"}

            run.node("compose")
            message = ProgressCoachService._compose(db, user_id, decision, signals)

            run.node("deliver")
            user = db.users.find_one({"id": user_id}) or {}
            sent = False
            if user.get("email"):
                sent = send_agent_email(
                    to=user["email"],
                    subject=message["subject"],
                    heading="Progress Coach",
                    body_html=message["html"],
                    cta_label="Open your dashboard",
                    cta_url=frontend_url() + message["link"],
                )

            notify(db, user_id, message["subject"], message["summary"], message["link"])

            db.users.update_one(
                {"id": user_id},
                {"$set": {"coach_last_run_at": datetime.utcnow()}},
            )

            run.finish(result={"action": decision["kind"], "email_sent": sent})
            return {"status": "complete", "action": decision["kind"], "email_sent": sent}

    # ── Signals ───────────────────────────────────────────────────────────

    @staticmethod
    def _gather(db, user_id: int) -> dict:
        now = datetime.utcnow()
        since = now - timedelta(days=CELEBRATE_WINDOW)

        ideas = list(db.ideas.find({"user_id": user_id}, {
            "id": 1, "title": 1, "status": 1, "created_at": 1,
            "updated_at": 1, "overall_score": 1,
        }))

        def ts(doc):
            return doc.get("updated_at") or doc.get("created_at")

        stamps = [ts(i) for i in ideas if ts(i)]
        latest = max(stamps) if stamps else None
        days_idle = (now - latest).days if latest else None

        completed = [i for i in ideas if i.get("status") == "completed"]
        best = None
        if ideas:
            best = max(ideas, key=lambda i: i.get("overall_score") or 0)

        return {
            "ideas_total": len(ideas),
            "completed": completed,
            "failed": [i for i in ideas if i.get("status") == "failed"],
            "processing": [i for i in ideas if i.get("status") == "processing"],
            "recent_completions": [
                i for i in completed if ts(i) and ts(i) >= since
            ],
            "days_idle": days_idle,
            "best": best,
        }

    # ── Decision ──────────────────────────────────────────────────────────

    @staticmethod
    def _decide(s: dict):
        """
        Pick at most one thing to say. Sending two nudges in one email trains
        people to ignore the sender, so the coach speaks only when it has the
        single most useful thing to say.
        """
        if s["failed"]:
            return {"kind": "failed_analysis", "idea": s["failed"][0]}

        if s["processing"]:
            return None  # work is in flight; let it finish before commenting

        if len(s["recent_completions"]) >= 2:
            return {"kind": "celebrate", "count": len(s["recent_completions"])}

        if s["days_idle"] is not None and s["days_idle"] >= STALE_DAYS:
            return {"kind": "stale", "days": s["days_idle"], "idea": s["best"]}

        return None

    # ── Message ───────────────────────────────────────────────────────────

    @staticmethod
    def _compose(db, user_id: int, decision: dict, signals: dict) -> dict:
        from app.services.gemini_service import GeminiService

        user = db.users.find_one({"id": user_id}) or {}
        name = user.get("first_name") or "there"
        kind = decision["kind"]

        if kind == "failed_analysis":
            idea = decision["idea"]
            title = idea.get("title", "Your idea")
            subject = f"{title} needs a retry"
            summary = "One of your analyses didn't finish. Retrying takes one click."
            fallback = (
                f"Hi {esc(name)}, the analysis for <strong>{esc(title)}</strong> "
                "didn't finish. Re-running it usually works first time."
            )
            link = f"/dashboard/idea/{idea.get('id')}/progress"

        elif kind == "celebrate":
            n = decision["count"]
            subject = f"{n} analyses finished this week"
            summary = f"You completed {n} analyses this week. Momentum is building."
            fallback = (
                f"Hi {esc(name)}, you finished <strong>{n} analyses</strong> this week. "
                "That is real momentum — pick the strongest one and start talking to customers."
            )
            link = "/dashboard/ideas"

        else:  # stale
            days = decision["days"]
            idea = decision.get("idea") or {}
            subject = "Anything blocking you?"
            summary = f"No activity for {days} days. A small next step beats a big plan."
            fallback = (
                f"Hi {esc(name)}, it has been <strong>{days} days</strong> since you last worked on "
                f"<strong>{esc(idea.get('title', 'your idea'))}</strong>. What is blocking you? "
                "Often the smallest next step is the one worth taking."
            )
            link = f"/dashboard/idea/{idea.get('id')}/validation" if idea.get("id") else "/dashboard"

        # A short model-written line makes the nudge feel personal rather than
        # templated. If the model is unavailable the fallback copy stands alone.
        extra_line = ""
        try:
            best_title = (signals.get("best") or {}).get("title", "unknown")
            prompt = (
                "Write ONE short encouraging sentence (max 25 words) to a startup founder.\n\n"
                f"Situation: {kind.replace('_', ' ')}\n"
                f"Their strongest idea: {best_title}\n"
                f"Ideas completed: {len(signals['completed'])}\n\n"
                "Be specific and warm, never generic hustle-culture language. "
                "No emoji, no exclamation marks.\n"
                'Return JSON only: {"line": "..."}'
            )
            res = GeminiService.call_gemini(prompt, stage="progress_coach")
            if res.get("success") and isinstance(res.get("data"), dict):
                line = str(res["data"].get("line", "")).strip()
                if line:
                    extra_line = (
                        '<p style="margin:14px 0 0;color:#4338ca;font-style:italic;'
                        'font-size:14px;line-height:1.6;">' + esc(line) + "</p>"
                    )
        except Exception as e:
            logger.warning("[ProgressCoach] personalisation failed: %s", e)

        html = (
            '<p style="margin:0;color:#374151;font-size:14px;line-height:1.65;">'
            + fallback
            + "</p>"
            + extra_line
        )
        return {"subject": subject, "summary": summary, "html": html, "link": link}

    # ── Scheduling ────────────────────────────────────────────────────────

    @staticmethod
    def due_user_ids(db) -> list[int]:
        """
        Founders to coach on this tick.

        Available on every tier, but skipped for anyone coached in the last
        24 hours so a daily cron can never double-send.
        """
        cutoff = datetime.utcnow() - timedelta(hours=24)
        due = []
        for user in db.users.find({}, {"id": 1, "coach_last_run_at": 1}):
            uid = user.get("id")
            if uid is None:
                continue
            last = user.get("coach_last_run_at")
            if last and last > cutoff:
                continue
            if not agent_enabled_for(db, uid, AGENT_TYPE):
                continue
            due.append(uid)
        return due
