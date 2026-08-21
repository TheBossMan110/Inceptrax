"""
Inngest functions: Competitor Watcher v2 (Agent #2 — Phase 2 spec §6.3)

Triggered by:
  - Cron:  Weekly, Tuesdays 09:00 UTC (offset from Idea Watcher's Monday run
           so the two agents never compete for the same rate limits)
  - Event: agent/competitor-watcher.requested — manual run from the dashboard

The v1 keyword scanner (competitor_scan.py) remains registered and untouched.
"""

import inngest
from app_fastapi.inngest_client import inngest_client


@inngest_client.create_function(
    fn_id="competitor-watcher-v2-weekly",
    trigger=inngest.TriggerCron(cron="0 9 * * TUE"),
    retries=2,
)
async def competitor_watcher_weekly(ctx: inngest.Context, step: inngest.Step) -> str:
    idea_ids = await step.run("load-due-ideas", _load_due)

    if not idea_ids:
        ctx.logger.info("[CompetitorWatcher] No ideas due.")
        return "No ideas due"

    flagged = 0
    for idea_id in idea_ids:
        try:
            result = await step.run(
                f"watch-idea-{idea_id}",
                lambda i=idea_id: _watch(i, "cron"),
            )
            if result and result.get("alerts"):
                flagged += 1
        except Exception as e:
            ctx.logger.error(f"[CompetitorWatcher] idea #{idea_id} failed: {e}")

    ctx.logger.info(f"[CompetitorWatcher] Weekly done — {flagged}/{len(idea_ids)} flagged.")
    return f"Flagged {flagged} of {len(idea_ids)} ideas"


@inngest_client.create_function(
    fn_id="competitor-watcher-v2-manual",
    trigger=inngest.TriggerEvent(event="agent/competitor-watcher.requested"),
    retries=1,
)
async def competitor_watcher_manual(ctx: inngest.Context, step: inngest.Step) -> str:
    idea_id = ctx.event.data["idea_id"]
    result = await step.run("watch-idea", lambda: _watch(idea_id, "manual"))
    alerts = (result or {}).get("alerts", 0)
    ctx.logger.info(f"[CompetitorWatcher] Manual run idea #{idea_id} -> {alerts} alert(s)")
    return f"idea #{idea_id}: {alerts} alerts"


def _load_due():
    from app import get_db
    from app_fastapi.services.competitor_watcher_service import CompetitorWatcherService
    return CompetitorWatcherService.due_idea_ids(get_db())


def _watch(idea_id: int, trigger: str):
    from app_fastapi.services.competitor_watcher_service import CompetitorWatcherService
    return CompetitorWatcherService.run(idea_id, trigger=trigger)
