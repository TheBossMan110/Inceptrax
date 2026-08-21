"""
Inngest functions: Pivot Suggester (Agent #4 — Phase 2 spec §6.5)

Event-driven, not scheduled. Fires when:
  - agent/pivot.requested            — founder asks directly (bypasses cooldown)
  - agent/high-threat-competitor     — Competitor Watcher found a serious rival
  - agent/industry-disruption        — Idea Watcher saw a market shift

The upstream-signal triggers respect a per-idea cooldown so a burst of related
findings produces one considered suggestion rather than four.
"""

import inngest
from app_fastapi.inngest_client import inngest_client


@inngest_client.create_function(
    fn_id="pivot-suggester-manual",
    trigger=inngest.TriggerEvent(event="agent/pivot.requested"),
    retries=1,
)
async def pivot_manual(ctx: inngest.Context, step: inngest.Step) -> str:
    """Founder explicitly asked whether to pivot — always runs."""
    idea_id = ctx.event.data["idea_id"]
    result = await step.run(
        "assess",
        lambda: _assess(idea_id, "manual", "The founder asked directly."),
    )
    rec = (result or {}).get("recommendation", "unknown")
    ctx.logger.info(f"[PivotSuggester] idea #{idea_id} -> {rec}")
    return f"idea #{idea_id}: {rec}"


@inngest_client.create_function(
    fn_id="pivot-suggester-on-threat",
    trigger=inngest.TriggerEvent(event="agent/high-threat-competitor"),
    retries=1,
)
async def pivot_on_threat(ctx: inngest.Context, step: inngest.Step) -> str:
    """A well-positioned competitor appeared — is the premise still sound?"""
    idea_id = ctx.event.data["idea_id"]
    detail = ctx.event.data.get("detail", "A high-threat competitor was detected.")
    return await _guarded(ctx, step, idea_id, "competitor_threat", detail)


@inngest_client.create_function(
    fn_id="pivot-suggester-on-disruption",
    trigger=inngest.TriggerEvent(event="agent/industry-disruption"),
    retries=1,
)
async def pivot_on_disruption(ctx: inngest.Context, step: inngest.Step) -> str:
    """Idea Watcher saw the market move underneath this idea."""
    idea_id = ctx.event.data["idea_id"]
    detail = ctx.event.data.get("detail", "A significant industry shift was detected.")
    return await _guarded(ctx, step, idea_id, "industry_disruption", detail)


async def _guarded(ctx, step, idea_id: int, trigger: str, detail: str) -> str:
    allowed = await step.run(f"cooldown-check-{idea_id}", lambda: _should_trigger(idea_id))
    if not allowed:
        ctx.logger.info(f"[PivotSuggester] idea #{idea_id} skipped — within cooldown.")
        return f"idea #{idea_id}: skipped (cooldown)"

    result = await step.run("assess", lambda: _assess(idea_id, trigger, detail))
    rec = (result or {}).get("recommendation", "unknown")
    ctx.logger.info(f"[PivotSuggester] idea #{idea_id} ({trigger}) -> {rec}")
    return f"idea #{idea_id}: {rec}"


def _should_trigger(idea_id: int) -> bool:
    from app import get_db
    from app_fastapi.services.pivot_suggester_service import PivotSuggesterService
    return PivotSuggesterService.should_trigger(get_db(), idea_id)


def _assess(idea_id: int, trigger: str, reason: str):
    from app_fastapi.services.pivot_suggester_service import PivotSuggesterService
    return PivotSuggesterService.run(idea_id, trigger=trigger, reason=reason)
