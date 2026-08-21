"""
RAG router — "Ask anything about my startup" (Phase 2 spec §7.1)

    POST /api/ideas/{idea_id}/ask       ask a question about your own idea
    POST /api/ideas/{idea_id}/reindex   rebuild the searchable context
    GET  /api/ideas/{idea_id}/rag-status  what is indexed, and today's quota

Security: `user_id` is always taken from the authenticated session and passed
explicitly into every retrieval call. Ownership is re-checked here even though
retrieval filters again — one missed filter should never be enough to leak
another founder's analysis.
"""

import asyncio
import logging
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app_fastapi.dependencies import get_current_user
from app_fastapi.services.credit_service import CreditService, TIER_CONFIG

logger = logging.getLogger(__name__)
router = APIRouter()


class AskRequest(BaseModel):
    question: str = Field(min_length=3, max_length=1000)


async def _owned_idea_or_404(db, idea_id: int, user_id: int) -> dict:
    idea = await db.ideas.find_one({"id": idea_id})
    if not idea or idea.get("user_id") != user_id:
        raise HTTPException(status_code=404, detail="Idea not found")
    return idea


async def _enforce_daily_quota(db, user_id: int) -> dict:
    """
    Per-tier daily question limit (spec §7.7).

    Counted from the rag_queries log rather than a counter field so the limit
    can never drift out of sync with reality.
    """
    tier = await CreditService.get_tier(db, user_id)
    config = TIER_CONFIG.get(tier, TIER_CONFIG["free"])
    limit = config["rag_queries_per_day"]

    since = datetime.utcnow() - timedelta(days=1)
    used = await db.rag_queries.count_documents({"user_id": user_id, "created_at": {"$gte": since}})

    if used >= limit:
        raise HTTPException(
            status_code=402,
            detail={
                "error": "rag_limit_reached",
                "message": (
                    f"Your {config['label']} plan includes {limit} questions a day "
                    f"and you've used {used}."
                ),
                "current": used,
                "maximum": limit,
                "tier": tier,
                "tier_label": config["label"],
                "upgrade_url": "/dashboard/billing",
            },
        )
    return {"used": used, "limit": limit, "tier": tier, "tier_label": config["label"]}


@router.post("/{idea_id}/ask")
async def ask_about_idea(
    idea_id: int,
    body: AskRequest,
    current_user: dict = Depends(get_current_user),
):
    """Answer a question grounded in this idea's own analysis."""
    from app_fastapi import get_db
    from app_fastapi.services.rag_service import RAGService

    db = get_db()
    user_id = current_user["id"]
    await _owned_idea_or_404(db, idea_id, user_id)
    quota = await _enforce_daily_quota(db, user_id)

    # Nothing indexed yet — build it on first use so the founder never has to
    # know the feature needed priming.
    indexed = await db.idea_context.count_documents({"idea_id": idea_id, "user_id": user_id})
    if indexed == 0:
        await asyncio.to_thread(RAGService.index_idea, idea_id)

    result = await asyncio.to_thread(
        RAGService.ask, body.question, idea_id, user_id
    )

    await db.rag_queries.insert_one({
        "user_id": user_id,
        "idea_id": idea_id,
        "question": body.question[:500],
        "grounded": result.get("grounded", False),
        "created_at": datetime.utcnow(),
    })

    return {
        "status": "success",
        "data": {
            **result,
            "quota": {"used": quota["used"] + 1, "limit": quota["limit"]},
        },
    }


@router.post("/{idea_id}/reindex")
async def reindex_idea(idea_id: int, current_user: dict = Depends(get_current_user)):
    """Rebuild this idea's searchable context after new analysis or agent runs."""
    from app_fastapi import get_db
    from app_fastapi.services.rag_service import RAGService

    db = get_db()
    await _owned_idea_or_404(db, idea_id, current_user["id"])

    result = await asyncio.to_thread(RAGService.index_idea, idea_id)
    return {"status": "success", "data": result}


@router.get("/{idea_id}/rag-status")
async def rag_status(idea_id: int, current_user: dict = Depends(get_current_user)):
    """What is indexed for this idea, and how many questions remain today."""
    from app_fastapi import get_db

    db = get_db()
    user_id = current_user["id"]
    await _owned_idea_or_404(db, idea_id, user_id)

    tier = await CreditService.get_tier(db, user_id)
    config = TIER_CONFIG.get(tier, TIER_CONFIG["free"])
    since = datetime.utcnow() - timedelta(days=1)
    used = await db.rag_queries.count_documents({"user_id": user_id, "created_at": {"$gte": since}})

    chunks = await db.idea_context.count_documents({"idea_id": idea_id, "user_id": user_id})
    by_source = {}
    async for doc in db.idea_context.aggregate([
        {"$match": {"idea_id": idea_id, "user_id": user_id}},
        {"$group": {"_id": "$source_type", "n": {"$sum": 1}}},
    ]):
        by_source[doc["_id"]] = doc["n"]

    return {
        "status": "success",
        "data": {
            "indexed": chunks > 0,
            "chunks": chunks,
            "sources": by_source,
            "quota": {
                "used": used,
                "limit": config["rag_queries_per_day"],
                "tier_label": config["label"],
            },
        },
    }
