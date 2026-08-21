"""
Shared plumbing for Inceptrax agents (Phase 2 spec §6.6).

Idea Watcher established the pattern: every agent run is checkpointed into
`agent_runs` so a crashed or retried run can be inspected rather than silently
lost. This module extracts that bookkeeping so each new agent only has to
express its own logic.

Everything here is synchronous — agents run inside Inngest step executors and
use the sync pymongo handle, matching the other inngest_functions.
"""

import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class AgentRun:
    """
    Context manager wrapping one agent execution.

        with AgentRun("progress_coach", idea_id=4, trigger="cron") as run:
            run.node("gather")
            ...
            run.finish(result={"nudged": True})

    On an unhandled exception the run is marked failed with the error text,
    so a silent crash still leaves a trace to debug from.
    """

    def __init__(self, agent_type: str, user_id=None, idea_id=None,
                 trigger: str = "cron", run_id: str | None = None,
                 cost_usd: float = 0.0):
        from app import get_db
        self.db = get_db()
        self.agent_type = agent_type
        self.idea_id = idea_id
        self.trigger = trigger
        self.cost_usd = cost_usd
        self._result = None
        self._status = "running"

        if user_id is None and idea_id is not None:
            idea = self.db.ideas.find_one({"id": idea_id}, {"user_id": 1}) or {}
            user_id = idea.get("user_id")
        self.user_id = user_id

        self.id = next_id(self.db, "agent_runs")
        self.db.agent_runs.insert_one({
            "id": self.id,
            "agent_type": agent_type,
            "user_id": user_id,
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

    def node(self, name: str):
        """Checkpoint progress so a stuck run shows where it stopped."""
        self.db.agent_runs.update_one(
            {"id": self.id},
            {"$set": {"current_node": name, "updated_at": datetime.utcnow()}},
        )

    def finish(self, result=None, status="complete"):
        self._result = result
        self._status = status

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        if exc is not None:
            logger.exception("[%s] run #%s failed", self.agent_type, self.id)
            self._status, self._result = "failed", None
            error = str(exc)[:500]
        else:
            error = None

        self.db.agent_runs.update_one(
            {"id": self.id},
            {"$set": {
                "status": self._status,
                "result": self._result,
                "error": error,
                "current_node": "end",
                "cost_usd": self.cost_usd if self._status == "complete" else 0,
                "completed_at": datetime.utcnow(),
            }},
        )
        return False  # never swallow the exception; Inngest should see it


def next_id(db, collection: str) -> int:
    counter = db.counters.find_one_and_update(
        {"_id": collection}, {"$inc": {"seq": 1}},
        upsert=True, return_document=True,
    )
    return counter["seq"]


def agent_enabled_for(db, user_id: int, agent_type: str) -> bool:
    """
    Tier gate for scheduled agent runs (spec §3.2).

    Manual, user-initiated runs bypass this deliberately — letting someone
    trigger an agent once is a far better upgrade prompt than hiding it.
    """
    from app_fastapi.services.credit_service import TIER_CONFIG, resolve_tier

    user = db.users.find_one({"id": user_id}, {"subscription_tier": 1}) or {}
    tier = resolve_tier(user.get("subscription_tier", "free"))
    return agent_type in TIER_CONFIG.get(tier, TIER_CONFIG["free"])["agents_allowed"]


def notify(db, user_id: int, title: str, message: str, link: str, kind: str = "agent"):
    """In-app notification so agent output is visible without email."""
    try:
        db.notifications.insert_one({
            "id": next_id(db, "notifications"),
            "user_id": user_id,
            "title": title,
            "message": message,
            "type": kind,
            "link": link,
            "is_read": False,
            "created_at": datetime.utcnow(),
        })
    except Exception as e:
        logger.warning("[agents] notification insert failed: %s", e)


def send_agent_email(to: str, subject: str, heading: str, body_html: str,
                     cta_label: str, cta_url: str) -> bool:
    """
    Branded agent email. Shares one shell so every agent looks like the same
    product rather than three different senders.
    """
    from app.services.email_service import EmailService

    html = f"""<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f3f4f6;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:28px 12px;">
<tr><td align="center">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <tr><td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:26px 28px;border-radius:12px 12px 0 0;">
      <h1 style="color:#fff;margin:0;font-size:20px;font-weight:600;">Inceptrax</h1>
      <p style="color:rgba(255,255,255,0.82);margin:4px 0 0;font-size:13px;">{heading}</p>
    </td></tr>
    <tr><td style="background:#fff;padding:26px 28px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
      {body_html}
      <a href="{cta_url}" style="display:inline-block;margin-top:22px;background:#6366f1;color:#fff;
         padding:11px 22px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;">{cta_label}</a>
    </td></tr>
  </table>
</td></tr></table>
</body></html>"""

    try:
        ok, msg = EmailService.send_email(to, subject, html)
        if not ok:
            logger.warning("[agents] email to %s not sent: %s", to, msg)
        return bool(ok)
    except Exception as e:
        logger.warning("[agents] email error for %s: %s", to, e)
        return False


def frontend_url() -> str:
    import os
    return os.environ.get("FRONTEND_URL", "https://www.inceptrax.com").rstrip("/")


def esc(text) -> str:
    import html
    return html.escape(str(text or ""), quote=True)
