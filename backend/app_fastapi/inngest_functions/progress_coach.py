"""
Inngest functions: Progress Coach (Agent #3 — Phase 2 spec §6.4)

Triggered by:
  - Cron:  Daily at 16:00 UTC
  - Event: agent/progress-coach.requested — manual run from the dashboard

Each founder is a separate retriable step, so one failure never blocks the
rest of the daily batch.
"""

import inngest
from app_fastapi.inngest_client import inngest_client


@inngest_client.create_function(
    fn_id="progress-coach-daily",
    trigger=inngest.TriggerCron(cron="0 16 * * *"),
    retries=2,
)
async def progress_coach_daily(ctx: inngest.Context, step: inngest.Step) -> str:
    """Daily coaching pass across every founder who is due."""
    user_ids = await step.run("load-due-users", _load_due_users)

    if not user_ids:
        ctx.logger.info("[ProgressCoach] Nobody due today.")
        return "Nobody due"

    coached = 0
    for uid in user_ids:
        try:
            result = await step.run(
                f"coach-user-{uid}",
                lambda u=uid: _coach_one(u, "cron"),
            )
            if result and result.get("action") not in (None, "none"):
                coached += 1
        except Exception as e:
            ctx.logger.error(f"[ProgressCoach] user #{uid} failed: {e}")

    ctx.logger.info(f"[ProgressCoach] Daily pass done — {coached}/{len(user_ids)} nudged.")
    return f"Coached {coached} of {len(user_ids)} founders"


@inngest_client.create_function(
    fn_id="progress-coach-manual",
    trigger=inngest.TriggerEvent(event="agent/progress-coach.requested"),
    retries=1,
)
async def progress_coach_manual(ctx: inngest.Context, step: inngest.Step) -> str:
    """Manual coaching run for one founder."""
    user_id = ctx.event.data["user_id"]
    result = await step.run("coach-user", lambda: _coach_one(user_id, "manual"))
    action = (result or {}).get("action", "none")
    ctx.logger.info(f"[ProgressCoach] Manual run for user #{user_id} -> {action}")
    return f"user #{user_id}: {action}"


def _load_due_users():
    from app import get_db
    from app_fastapi.services.progress_coach_service import ProgressCoachService
    return ProgressCoachService.due_user_ids(get_db())


def _coach_one(user_id: int, trigger: str):
    from app_fastapi.services.progress_coach_service import ProgressCoachService
    return ProgressCoachService.run(user_id, trigger=trigger)
