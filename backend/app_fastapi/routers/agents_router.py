"""
Agents Router — Idea Watcher (Agent #1, Phase 2 spec §6.2)

Endpoints:
    GET   /api/agents/idea-watcher/{idea_id}          — settings + digests + last run
    POST  /api/agents/idea-watcher/{idea_id}/run      — trigger a run now
    PUT   /api/agents/idea-watcher/{idea_id}/settings — enable/disable, frequency, pause
    GET   /api/agents/idea-watcher/{idea_id}/digest/{digest_id} — one full digest
"""

import logging
from datetime import datetime, timedelta
from typing import Optional, Literal

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from app_fastapi.dependencies import get_current_user
from app_fastapi.services.idea_watcher_service import (
    AGENT_TYPE,
    MANUAL_COOLDOWN_MINUTES,
)

logger = logging.getLogger(__name__)

router = APIRouter()


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _s(data=None, message="Success"):
    return JSONResponse(content={"status": "success", "message": message, "data": data})


def _iso(value):
    return value.isoformat() if isinstance(value, datetime) else value


def _clean(doc: dict) -> dict:
    out = {k: v for k, v in doc.items() if k != "_id"}
    for key, value in list(out.items()):
        if isinstance(value, datetime):
            out[key] = value.isoformat()
    return out


async def _owned_idea_or_404(db, idea_id: int, user_id: int) -> dict:
    idea = await db.ideas.find_one({"id": idea_id})
    if not idea or idea.get("user_id") != user_id:
        raise HTTPException(status_code=404, detail="Idea not found")
    return idea


class WatcherSettings(BaseModel):
    enabled: Optional[bool] = None
    frequency: Optional[Literal["weekly", "monthly"]] = None
    pause_days: Optional[int] = Field(default=None, ge=0, le=90)


# ─── Read state ───────────────────────────────────────────────────────────────

@router.get("/idea-watcher/{idea_id}")
async def get_watcher_state(
    idea_id: int,
    current_user: dict = Depends(get_current_user),
):
    """Settings, recent digests, and the status of the most recent run."""
    from app_fastapi import get_db

    db = get_db()
    await _owned_idea_or_404(db, idea_id, current_user["id"])

    settings_doc = await db.idea_watcher_settings.find_one({"idea_id": idea_id}) or {}
    paused_until = settings_doc.get("paused_until")
    now = datetime.utcnow()

    settings = {
        "enabled": settings_doc.get("enabled", True),   # on by default, per spec
        "frequency": settings_doc.get("frequency", "weekly"),
        "paused_until": _iso(paused_until) if paused_until and paused_until > now else None,
        "last_run_at": _iso(settings_doc.get("last_run_at")),
    }

    digests = [
        _clean(doc)
        async for doc in db.idea_watcher_runs.find({"idea_id": idea_id})
        .sort("created_at", -1)
        .limit(20)
    ]

    last_run = await db.agent_runs.find_one(
        {"agent_type": AGENT_TYPE, "idea_id": idea_id},
        sort=[("started_at", -1)],
    )

    # Cooldown on manual runs, so a demo click can't be spammed into a bill
    last_manual = await db.agent_runs.find_one(
        {"agent_type": AGENT_TYPE, "idea_id": idea_id, "trigger": "manual"},
        sort=[("started_at", -1)],
    )
    cooldown_until = None
    if last_manual and last_manual.get("started_at"):
        ready = last_manual["started_at"] + timedelta(minutes=MANUAL_COOLDOWN_MINUTES)
        if ready > now:
            cooldown_until = _iso(ready)

    return _s(data={
        "settings": settings,
        "digests": digests,
        "last_run": _clean(last_run) if last_run else None,
        "cooldown_until": cooldown_until,
        "tier": current_user.get("subscription_tier", "free"),
    })


@router.get("/idea-watcher/{idea_id}/digest/{digest_id}")
async def get_digest(
    idea_id: int,
    digest_id: int,
    current_user: dict = Depends(get_current_user),
):
    """A single digest in full."""
    from app_fastapi import get_db

    db = get_db()
    await _owned_idea_or_404(db, idea_id, current_user["id"])

    digest = await db.idea_watcher_runs.find_one({"id": digest_id, "idea_id": idea_id})
    if not digest:
        raise HTTPException(status_code=404, detail="Digest not found")

    return _s(data={"digest": _clean(digest)})


# ─── Trigger a run ────────────────────────────────────────────────────────────

@router.post("/idea-watcher/{idea_id}/run")
async def run_watcher_now(
    idea_id: int,
    current_user: dict = Depends(get_current_user),
):
    """
    Run the Idea Watcher immediately for this idea.

    Available on every tier — a manual run is user-initiated and gives free
    users a real taste of the agent. The weekly cron stays Pro/Team only.
    A per-idea cooldown keeps the cost bounded.
    """
    from app_fastapi import get_db

    db = get_db()
    await _owned_idea_or_404(db, idea_id, current_user["id"])

    last_manual = await db.agent_runs.find_one(
        {"agent_type": AGENT_TYPE, "idea_id": idea_id, "trigger": "manual"},
        sort=[("started_at", -1)],
    )
    if last_manual and last_manual.get("started_at"):
        ready = last_manual["started_at"] + timedelta(minutes=MANUAL_COOLDOWN_MINUTES)
        if ready > datetime.utcnow():
            raise HTTPException(
                status_code=429,
                detail=f"Idea Watcher already ran recently. Try again after {ready.strftime('%H:%M')} UTC.",
            )

    # Prevent two concurrent runs on the same idea (spec §6.6)
    running = await db.agent_runs.find_one(
        {"agent_type": AGENT_TYPE, "idea_id": idea_id, "status": "running"}
    )
    if running:
        raise HTTPException(status_code=409, detail="A watch run is already in progress.")

    # Preferred path: hand it to Inngest so the run is durable and retried.
    try:
        import inngest
        from app_fastapi.inngest_client import inngest_client

        await inngest_client.send(
            inngest.Event(
                name="agent/idea-watcher.requested",
                data={"idea_id": idea_id, "user_id": current_user["id"]},
            )
        )
        return _s(
            data={"queued": True, "mode": "inngest"},
            message="Idea Watcher is running — this takes about a minute.",
        )

    except Exception as e:
        # Inngest unreachable (no dev server, network blip). Rather than fail the
        # request, run the agent in a worker thread. The user still gets their
        # digest; only the retry guarantee is lost.
        logger.warning(f"[IdeaWatcher] Inngest dispatch failed, running inline: {e}")
        _spawn_inline_run(idea_id)
        return _s(
            data={"queued": True, "mode": "inline"},
            message="Idea Watcher is running — this takes about a minute.",
        )


# Strong references so fire-and-forget tasks are not garbage collected mid-run
_inline_tasks: set = set()


def _spawn_inline_run(idea_id: int):
    """Run the agent off the request cycle, in a thread (the service is sync)."""
    import asyncio

    async def _runner():
        from app_fastapi.services.idea_watcher_service import IdeaWatcherService
        try:
            await asyncio.to_thread(IdeaWatcherService.run, idea_id, "manual")
        except Exception as exc:
            logger.exception(f"[IdeaWatcher] Inline run failed for idea #{idea_id}: {exc}")

    task = asyncio.create_task(_runner())
    _inline_tasks.add(task)
    task.add_done_callback(_inline_tasks.discard)


# ─── Settings ─────────────────────────────────────────────────────────────────

@router.put("/idea-watcher/{idea_id}/settings")
async def update_watcher_settings(
    idea_id: int,
    body: WatcherSettings,
    current_user: dict = Depends(get_current_user),
):
    """Toggle the watcher, change frequency, or pause it for a number of days."""
    from app_fastapi import get_db

    db = get_db()
    await _owned_idea_or_404(db, idea_id, current_user["id"])

    update: dict = {"updated_at": datetime.utcnow(), "user_id": current_user["id"]}

    if body.enabled is not None:
        update["enabled"] = body.enabled
    if body.frequency is not None:
        update["frequency"] = body.frequency
    if body.pause_days is not None:
        update["paused_until"] = (
            datetime.utcnow() + timedelta(days=body.pause_days)
            if body.pause_days > 0
            else None
        )

    await db.idea_watcher_settings.update_one(
        {"idea_id": idea_id}, {"$set": update}, upsert=True
    )

    doc = await db.idea_watcher_settings.find_one({"idea_id": idea_id}) or {}
    paused_until = doc.get("paused_until")
    now = datetime.utcnow()

    return _s(
        data={"settings": {
            "enabled": doc.get("enabled", True),
            "frequency": doc.get("frequency", "weekly"),
            "paused_until": _iso(paused_until) if paused_until and paused_until > now else None,
            "last_run_at": _iso(doc.get("last_run_at")),
        }},
        message="Settings saved",
    )
