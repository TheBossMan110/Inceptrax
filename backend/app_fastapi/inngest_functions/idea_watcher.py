"""
Inngest functions: Idea Watcher (Agent #1 — Phase 2 spec §6.2)

Triggered by:
  - Cron:  Every Monday 09:00 UTC — fans out to every due idea
  - Event: agent/idea-watcher.requested — manual "Run now" from the dashboard

Each idea is its own retriable step, so one failing idea never blocks the rest
of the weekly batch.
"""

import inngest
from app_fastapi.inngest_client import inngest_client


@inngest_client.create_function(
    fn_id="idea-watcher-weekly",
    trigger=inngest.TriggerCron(cron="0 9 * * MON"),
    retries=2,
)
async def idea_watcher_weekly(ctx: inngest.Context, step: inngest.Step) -> str:
    """Weekly fan-out across every idea whose watcher is due."""

    idea_ids = await step.run("load-due-ideas", _load_due_ideas)

    if not idea_ids:
        ctx.logger.info("[IdeaWatcher] No ideas due this week.")
        return "No ideas due"

    ctx.logger.info(f"[IdeaWatcher] {len(idea_ids)} idea(s) due this week.")

    sent = 0
    for idea_id in idea_ids:
        try:
            result = await step.run(
                f"watch-idea-{idea_id}",
                lambda iid=idea_id: _watch_one(iid, "cron"),
            )
            if result and result.get("findings"):
                sent += 1
        except Exception as e:
            ctx.logger.error(f"[IdeaWatcher] Idea #{idea_id} failed: {e}")

    ctx.logger.info(f"[IdeaWatcher] Weekly run complete — {sent}/{len(idea_ids)} digests sent.")
    return f"Sent {sent} digests across {len(idea_ids)} ideas"


@inngest_client.create_function(
    fn_id="idea-watcher-manual",
    trigger=inngest.TriggerEvent(event="agent/idea-watcher.requested"),
    retries=1,
)
async def idea_watcher_manual(ctx: inngest.Context, step: inngest.Step) -> str:
    """Manual run for a single idea, triggered from the dashboard."""
    idea_id = ctx.event.data["idea_id"]

    result = await step.run(
        "watch-idea",
        lambda: _watch_one(idea_id, "manual"),
    )

    findings = (result or {}).get("findings", 0)
    ctx.logger.info(f"[IdeaWatcher] Manual run for idea #{idea_id} — {findings} finding(s).")
    return f"Idea #{idea_id}: {findings} findings"


# ─── Sync helpers (run in Inngest's executor thread) ──────────────────────────

def _load_due_ideas():
    from app import get_db
    from app_fastapi.services.idea_watcher_service import IdeaWatcherService
    return IdeaWatcherService.due_idea_ids(get_db())


def _watch_one(idea_id: int, trigger: str):
    from app_fastapi.services.idea_watcher_service import IdeaWatcherService
    return IdeaWatcherService.run(idea_id, trigger=trigger)
