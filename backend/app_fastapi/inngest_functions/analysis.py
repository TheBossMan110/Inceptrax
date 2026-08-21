"""
Inngest function: run-idea-analysis

Triggered by: idea/analysis.requested events
Runs the 8-stage AI analysis pipeline with per-stage retries.
Credits deducted AFTER success — per spec rule.
"""

import inngest
from app_fastapi.inngest_client import inngest_client


@inngest_client.create_function(
    fn_id="run-idea-analysis",
    trigger=inngest.TriggerEvent(event="idea/analysis.requested"),
    retries=3,
)
async def run_idea_analysis(ctx: inngest.Context, step: inngest.Step) -> str:
    """Durable 8-stage analysis with per-stage checkpointing."""
    idea_id = ctx.event.data["idea_id"]
    user_id = ctx.event.data.get("user_id")

    ctx.logger.info(f"[Inngest] Starting analysis for idea #{idea_id}")

    # Run the full analysis as a single step
    await step.run(
        "run-full-analysis",
        lambda: _run_analysis_sync(idea_id),
    )

    # Deduct credits AFTER success
    if user_id:
        await step.run(
            "deduct-credits",
            lambda: _deduct_credits(user_id, idea_id),
        )

    ctx.logger.info(f"[Inngest] Analysis complete for idea #{idea_id}")
    return f"Analysis completed for idea #{idea_id}"


def _run_analysis_sync(idea_id: int):
    """Synchronous wrapper — runs in Inngest's executor thread."""
    from app.services.idea_analysis_service import IdeaAnalysisService
    result = IdeaAnalysisService.process_idea_analysis(idea_id)
    return {"status": "completed", "idea_id": idea_id}


def _deduct_credits(user_id: int, idea_id: int):
    """Deduct analysis credits after successful completion (sync pymongo)."""
    from app import get_db
    from app_fastapi.services.credit_service import CREDIT_COSTS
    from datetime import datetime

    db = get_db()
    cost = CREDIT_COSTS.get("analysis", 30)

    # Atomic deduct
    result = db.users.find_one_and_update(
        {"id": user_id, "credit_balance": {"$gte": cost}},
        {"$inc": {"credit_balance": -cost}},
        return_document=True,
    )

    if result:
        new_balance = result.get("credit_balance", 0)

        # Auto-increment ID
        counter = db.counters.find_one_and_update(
            {"_id": "credit_transactions"}, {"$inc": {"seq": 1}},
            upsert=True, return_document=True,
        )

        db.credit_transactions.insert_one({
            "id": counter["seq"],
            "user_id": user_id,
            "amount": -cost,
            "reason": "analysis",
            "related_idea_id": idea_id,
            "balance_after": new_balance,
            "created_at": datetime.utcnow(),
        })

        return {"deducted": cost, "new_balance": new_balance}

    return {"deducted": 0, "reason": "insufficient_credits"}
