"""
Inngest function: competitor-scan

Triggered by:
  - Cron: Every Monday at 9am UTC (weekly scan)
  - Event: competitor/scan.requested (manual trigger from dashboard)

Replaces APScheduler's scan_all_active_watches job.
"""

import inngest
from app_fastapi.inngest_client import inngest_client


@inngest_client.create_function(
    fn_id="competitor-weekly-scan",
    trigger=inngest.TriggerCron(cron="0 9 * * MON"),
    retries=2,
)
async def competitor_weekly_scan(ctx: inngest.Context, step: inngest.Step) -> str:
    """Scan all active competitor watches — runs weekly."""

    watches = await step.run(
        "load-active-watches",
        _load_active_watches,
    )

    if not watches:
        ctx.logger.info("[Inngest] No active competitor watches to scan.")
        return "No active watches"

    scan_count = 0
    for watch in watches:
        watch_id = watch["id"]
        try:
            await step.run(
                f"scan-watch-{watch_id}",
                lambda wid=watch_id: _scan_single_watch(wid),
            )
            scan_count += 1
        except Exception as e:
            ctx.logger.error(f"[Inngest] Failed to scan watch #{watch_id}: {e}")

    ctx.logger.info(f"[Inngest] Competitor scan complete. Scanned {scan_count}/{len(watches)} watches.")
    return f"Scanned {scan_count} watches"


@inngest_client.create_function(
    fn_id="competitor-manual-scan",
    trigger=inngest.TriggerEvent(event="competitor/scan.requested"),
    retries=2,
)
async def competitor_manual_scan(ctx: inngest.Context, step: inngest.Step) -> str:
    """Manual competitor scan for a single watch — triggered from dashboard."""
    watch_id = ctx.event.data["watch_id"]

    result = await step.run(
        "scan-watch",
        lambda: _scan_single_watch(watch_id),
    )

    ctx.logger.info(f"[Inngest] Manual scan complete for watch #{watch_id}")
    return f"Manual scan complete for watch #{watch_id}"


def _load_active_watches():
    """Load all active competitor watches from DB (sync pymongo)."""
    from app import get_db
    db = get_db()
    watches = list(db.competitor_watch.find({"is_active": True}))
    # Convert ObjectId for serialization
    return [{"id": w["id"], "idea_id": w.get("idea_id")} for w in watches]


def _scan_single_watch(watch_id: int):
    """Scan a single competitor watch (sync)."""
    from app.services.competitor_monitoring_service import CompetitorMonitoringService
    result = CompetitorMonitoringService.scan_competitors(watch_id)
    return {
        "watch_id": watch_id,
        "new_alerts": result.get("new_alerts", 0),
        "error": result.get("error"),
    }
