import asyncio
import inngest
import json
import secrets
import traceback
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from app_fastapi.dependencies import get_current_user
from app_fastapi.inngest_client import inngest_client

router = APIRouter()


# ─── Request Schemas ──────────────────────────────────────────────────────────

class CreateIdeaRequest(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=5000)
    problem: Optional[str] = None
    solution: Optional[str] = None
    audience: Optional[str] = None
    market: Optional[str] = None
    industry: Optional[str] = None
    target_market: Optional[str] = None
    target_audience: Optional[str] = None

class VisibilityRequest(BaseModel):
    is_public: Optional[bool] = None

class CommentRequest(BaseModel):
    content: str = Field(min_length=1, max_length=2000)
    author_name: str = Field(default="Anonymous", max_length=100)


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _success(data=None, message="Success", status=200):
    return JSONResponse(content={"status": "success", "message": message, "data": data}, status_code=status)

def _error(message="Error", status=400):
    return JSONResponse(content={"status": "error", "message": message}, status_code=status)

def _idea_to_dict(doc: dict) -> dict:
    d = {k: v for k, v in doc.items() if k != "_id"}
    for key in ("created_at", "updated_at"):
        if isinstance(d.get(key), datetime):
            d[key] = d[key].isoformat()
    return d

def _idea_to_public_dict(doc: dict) -> dict:
    exclude = {"_id", "user_id"}
    d = {k: v for k, v in doc.items() if k not in exclude}
    for key in ("created_at", "updated_at"):
        if isinstance(d.get(key), datetime):
            d[key] = d[key].isoformat()
    # Add validation_score from analysis_data
    ad = d.get("analysis_data")
    if isinstance(ad, dict):
        d["validation_score"] = ad.get("overall_score", 0)
    else:
        d["validation_score"] = 0
    return d

async def _get_next_id(db, collection_name: str) -> int:
    result = await db.counters.find_one_and_update(
        {"_id": collection_name}, {"$inc": {"seq": 1}},
        upsert=True, return_document=True,
    )
    return result["seq"]

async def _get_idea_or_404(db, idea_id: int, user_id: int) -> dict:
    idea = await db.ideas.find_one({"id": idea_id})
    if not idea or idea.get("user_id") != user_id:
        raise HTTPException(status_code=404, detail="Idea not found")
    return idea


# ─── Background Analysis Runner ──────────────────────────────────────────────

async def _run_background_analysis(idea_id: int):
    """Run the sync IdeaAnalysisService.process_idea_analysis in a thread."""
    try:
        from app.services.idea_analysis_service import IdeaAnalysisService
        # This service uses sync pymongo — run in thread to avoid blocking
        await asyncio.to_thread(IdeaAnalysisService.process_idea_analysis, idea_id)
    except Exception as e:
        print(f"[Background Analysis] Error for idea #{idea_id}: {e}")
        traceback.print_exc()


# ─── CRUD Routes ──────────────────────────────────────────────────────────────

@router.post("/", status_code=201)
async def create_idea(body: CreateIdeaRequest, current_user: dict = Depends(get_current_user)):
    """Create a new idea and start background analysis."""
    from app_fastapi import get_db
    from app_fastapi.services.credit_service import require_credits, require_idea_slot
    db = get_db()

    # Both gates raise a structured 402 so the frontend can show the upgrade
    # prompt with real numbers, rather than a generic error toast.
    await require_idea_slot(db, current_user["id"])
    await require_credits(db, current_user["id"], "analysis")

    # Sanitize input
    from app.services.utils.sanitize import sanitize_idea_data
    clean = sanitize_idea_data(body.model_dump())

    idea_id = await _get_next_id(db, "ideas")
    idea_doc = {
        "id": idea_id,
        "title": clean.get("title", body.title),
        "description": clean.get("description", body.description),
        "problem": clean.get("problem"), "solution": clean.get("solution"),
        "audience": clean.get("audience"), "market": clean.get("market"),
        "industry": clean.get("industry"),
        "target_market": clean.get("target_market"),
        "target_audience": clean.get("target_audience"),
        "user_id": current_user["id"],
        "created_at": datetime.utcnow(), "updated_at": None,
        "stage": "idea", "status": "processing",
        "current_stage": 0, "current_stage_name": "",
        "analysis_status": {
            "validation": "pending", "market": "pending",
            "competitors": "pending", "mvp": "pending",
            "monetization": "pending", "gtm": "pending",
        },
        "analysis_data": None, "overall_score": None, "risk_level": None,
        "is_public": False, "share_token": None,
        "public_views": 0, "ai_layers_count": 0, "founder_match_score": None,
    }
    await db.ideas.insert_one(idea_doc)

    # Dispatch durable background analysis via Inngest
    try:
        await inngest_client.send(inngest.Event(
            name="idea/analysis.requested",
            data={"idea_id": idea_id, "user_id": current_user["id"]},
        ))
    except Exception:
        # Fallback: run in-process if Inngest is unavailable
        asyncio.create_task(_run_background_analysis(idea_id))

    return _success(data={"idea": _idea_to_dict(idea_doc)}, message="Idea created — analysis started", status=201)


@router.get("/")
async def get_user_ideas(current_user: dict = Depends(get_current_user)):
    """Get all ideas for the current user."""
    from app_fastapi import get_db
    db = get_db()
    cursor = db.ideas.find({"user_id": current_user["id"]})
    ideas = [_idea_to_dict(doc) async for doc in cursor]
    return _success(data={"ideas": ideas})


@router.get("/public")
async def get_public_ideas(
    page: int = Query(1, ge=1),
    per_page: int = Query(12, ge=1, le=50),
    industry: str = Query(""),
    sort: str = Query("newest"),
):
    """Get public ideas for the Explore page — no auth required."""
    from app_fastapi import get_db
    db = get_db()

    query = {"is_public": True}
    if industry:
        query["industry"] = {"$regex": industry, "$options": "i"}

    sort_field = "created_at"
    if sort == "score": sort_field = "overall_score"
    elif sort == "most_viewed": sort_field = "public_views"

    total = await db.ideas.count_documents(query)
    skip = (page - 1) * per_page
    cursor = db.ideas.find(query).sort(sort_field, -1).skip(skip).limit(per_page)

    ideas_data = []
    async for idea in cursor:
        user = await db.users.find_one({"id": idea.get("user_id")})
        ideas_data.append({
            "id": idea["id"], "title": idea.get("title", ""),
            "description": (idea.get("description") or "")[:150],
            "industry": idea.get("industry") or idea.get("market") or "",
            "overall_score": idea.get("overall_score"),
            "share_token": idea.get("share_token"),
            "public_views": idea.get("public_views", 0),
            "created_at": idea["created_at"].isoformat() if isinstance(idea.get("created_at"), datetime) else str(idea.get("created_at", "")),
            "founder_id": idea.get("user_id"),
            "founder_name": user.get("first_name", "Anonymous") if user else "Anonymous",
            "founder_initial": user["first_name"][0].upper() if user and user.get("first_name") else "A",
        })

    pages = (total + per_page - 1) // per_page if per_page > 0 else 1
    return _success(data={"ideas": ideas_data, "total": total, "pages": pages, "current_page": page})


@router.get("/{idea_id}")
async def get_idea(idea_id: int, current_user: dict = Depends(get_current_user)):
    from app_fastapi import get_db
    db = get_db()
    idea = await _get_idea_or_404(db, idea_id, current_user["id"])
    return _success(data={"idea": _idea_to_dict(idea)})


@router.delete("/{idea_id}")
async def delete_idea(idea_id: int, current_user: dict = Depends(get_current_user)):
    from app_fastapi import get_db
    db = get_db()
    idea = await _get_idea_or_404(db, idea_id, current_user["id"])
    await db.ideas.delete_one({"_id": idea["_id"]})
    await db.stage_results.delete_many({"idea_id": idea_id})
    return _success(message="Idea deleted successfully")


@router.get("/{idea_id}/status")
async def get_idea_status(idea_id: int, current_user: dict = Depends(get_current_user)):
    """Get real-time analysis progress for stage tracker UI."""
    from app_fastapi import get_db
    db = get_db()
    idea = await _get_idea_or_404(db, idea_id, current_user["id"])

    completed = []
    async for sr in db.stage_results.find({"idea_id": idea_id}):
        completed.append(sr.get("stage_name"))

    return JSONResponse(content={
        "status": idea.get("status", "pending"),
        "current_stage": idea.get("current_stage", 0),
        "current_stage_name": idea.get("current_stage_name", ""),
        "completed_stages": completed,
        "overall_score": idea.get("overall_score", 0),
    })


@router.patch("/{idea_id}/visibility")
async def toggle_visibility(idea_id: int, body: VisibilityRequest, current_user: dict = Depends(get_current_user)):
    from app_fastapi import get_db
    db = get_db()
    idea = await _get_idea_or_404(db, idea_id, current_user["id"])

    new_public = body.is_public if body.is_public is not None else not idea.get("is_public", False)
    token = secrets.token_urlsafe(32)
    await db.ideas.update_one({"_id": idea["_id"]}, {"$set": {"is_public": new_public, "share_token": token}})

    idea["is_public"] = new_public
    idea["share_token"] = token
    return _success(data={"idea": _idea_to_dict(idea)})


@router.post("/{idea_id}/reanalyze")
async def reanalyze_idea(idea_id: int, current_user: dict = Depends(get_current_user)):
    from app_fastapi import get_db
    from app_fastapi.services.credit_service import require_credits
    db = get_db()
    idea = await _get_idea_or_404(db, idea_id, current_user["id"])

    # A re-analysis runs the full 8-stage pipeline, so it costs the same as a
    # first analysis. Charged after the run succeeds, inside the Inngest job.
    await require_credits(db, current_user["id"], "reanalyze")

    await db.ideas.update_one({"_id": idea["_id"]}, {"$set": {"status": "processing", "current_stage": 0, "current_stage_name": ""}})
    idea["status"] = "processing"

    # Dispatch durable re-analysis via Inngest
    try:
        await inngest_client.send(inngest.Event(
            name="idea/analysis.requested",
            data={"idea_id": idea_id, "user_id": current_user["id"]},
        ))
    except Exception:
        asyncio.create_task(_run_background_analysis(idea_id))
    return _success(data={"idea": _idea_to_dict(idea)}, message="Re-analysis started")


# ─── Shared / Public Endpoints ────────────────────────────────────────────────

@router.get("/shared/{share_token}")
async def get_public_idea(share_token: str):
    from app_fastapi import get_db
    db = get_db()

    idea = await db.ideas.find_one({"share_token": share_token})
    if not idea:
        return _error("This link is invalid or has expired.", 404)
    if not idea.get("is_public"):
        return _error("This idea is no longer public. The owner has made it private.", 403)

    await db.ideas.update_one({"_id": idea["_id"]}, {"$inc": {"public_views": 1}})
    return _success(data={"idea": _idea_to_public_dict(idea)}, message="Idea fetched successfully")


@router.get("/shared/{share_token}/comments")
async def get_shared_comments(share_token: str):
    from app_fastapi import get_db
    db = get_db()

    idea = await db.ideas.find_one({"share_token": share_token})
    if not idea:
        return _error("Invalid share token", 404)

    comments = []
    async for c in db.comments.find({"idea_id": idea["id"]}).sort("created_at", 1):
        cd = {k: v for k, v in c.items() if k != "_id"}
        if isinstance(cd.get("created_at"), datetime):
            cd["created_at"] = cd["created_at"].isoformat()
        comments.append(cd)

    return _success(data={"comments": comments}, message="Comments fetched successfully")


@router.post("/shared/{share_token}/comments", status_code=201)
async def post_shared_comment(share_token: str, body: CommentRequest):
    from app_fastapi import get_db
    db = get_db()

    idea = await db.ideas.find_one({"share_token": share_token})
    if not idea:
        return _error("Invalid share token", 404)

    comment_id = await _get_next_id(db, "comments")
    comment_doc = {
        "id": comment_id,
        "content": body.content.strip(),
        "author_name": body.author_name.strip() or "Anonymous",
        "idea_id": idea["id"],
        "created_at": datetime.utcnow(),
    }
    await db.comments.insert_one(comment_doc)

    cd = {k: v for k, v in comment_doc.items() if k != "_id"}
    cd["created_at"] = cd["created_at"].isoformat()
    return _success(data={"comment": cd}, message="Comment posted successfully", status=201)


# ─── Investor Pitch + Research Hub ────────────────────────────────────────────

@router.post("/{idea_id}/investor-pitch")
async def generate_investor_pitches(idea_id: int, current_user: dict = Depends(get_current_user)):
    from app_fastapi import get_db
    from app.services.idea_analysis_service import IdeaAnalysisService
    from app_fastapi.services.credit_service import CreditService, require_credits
    db = get_db()
    await _get_idea_or_404(db, idea_id, current_user["id"])

    await require_credits(db, current_user["id"], "investor_pitch")

    pitches = await asyncio.to_thread(IdeaAnalysisService.generate_investor_pitches, idea_id)
    if isinstance(pitches, dict) and "error" in pitches:
        return _error(pitches["error"], 500)

    await CreditService.deduct(db, current_user["id"], "investor_pitch", idea_id)
    return _success(data={"pitches": pitches}, message="Investor pitches generated successfully")


@router.post("/{idea_id}/research-hub")
async def generate_research_hub(idea_id: int, current_user: dict = Depends(get_current_user)):
    from app_fastapi import get_db
    from app.services.idea_analysis_service import IdeaAnalysisService
    db = get_db()
    from app_fastapi.services.credit_service import CreditService, require_credits
    idea = await _get_idea_or_404(db, idea_id, current_user["id"])

    # Only charge the first generation. Re-opening a hub that already exists
    # returns cached data and must stay free.
    ad = idea.get("analysis_data")
    already_generated = bool(ad and isinstance(ad, dict) and "research_hub" in ad)

    if not already_generated:
        await require_credits(db, current_user["id"], "research_hub")

    hub_data = await asyncio.to_thread(IdeaAnalysisService.generate_research_hub, idea_id)
    if isinstance(hub_data, dict) and "error" in hub_data:
        return _error(hub_data["error"], 500)

    if not already_generated:
        await CreditService.deduct(db, current_user["id"], "research_hub", idea_id)
        await db.users.update_one({"id": current_user["id"]}, {"$inc": {"api_credits_used": 1}})

    return _success(data={"hub": hub_data}, message="Research hub generated successfully")


@router.post("/{idea_id}/market/research")
async def fetch_market_research(idea_id: int, current_user: dict = Depends(get_current_user)):
    from app_fastapi import get_db
    from app.services.market_service import MarketService
    db = get_db()
    await _get_idea_or_404(db, idea_id, current_user["id"])

    results = await asyncio.to_thread(MarketService.fetch_market_data, idea_id)
    if isinstance(results, dict) and "error" in results:
        return _error(results["error"], 500)
    return _success(data={"market_data": results}, message="Market data fetched successfully")
