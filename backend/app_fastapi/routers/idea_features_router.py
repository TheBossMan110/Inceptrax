"""
Idea Features Router — AI-powered features and Competitor Watch

Endpoints: founder-match, stress-test, one-liner, layers engine, competitor watch,
file/voice upload.
"""

import asyncio
import json
import traceback
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from app_fastapi.dependencies import get_current_user

router = APIRouter()


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


# ─── Request Models ───────────────────────────────────────────────────────────

class LayersStartRequest(BaseModel):
    initial_idea: str = Field(min_length=1)

class LayersChatRequest(BaseModel):
    initial_idea: str = Field(min_length=1)
    history: list

class LayersFinalizeRequest(BaseModel):
    initial_idea: str = Field(min_length=1)
    history: list = []

class LayersImproveChatRequest(BaseModel):
    history: list

class CompetitorWatchRequest(BaseModel):
    is_active: Optional[bool] = None
    scan_frequency: Optional[str] = None
    keywords: Optional[list] = None


# ═══════════════════════════════════════════════════════════════════════════════
# AI Features: Founder Match, Stress Test, One-Liner
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/{idea_id}/founder-match")
async def founder_match_score(idea_id: int, current_user: dict = Depends(get_current_user)):
    from app_fastapi import get_db
    from app.services.gemini_service import GeminiService
    db = get_db()
    idea = await _get_idea_or_404(db, idea_id, current_user["id"])

    prompt = f"""You are evaluating how well a founder matches their startup idea.

Founder Profile:
- Name: {current_user.get('first_name', '')} {current_user.get('last_name', '')}
- Skills: {current_user.get('skills') or 'Not specified'}
- Bio: {current_user.get('bio') or 'Not specified'}
- Looking for: {current_user.get('looking_for') or 'Not specified'}

Startup Idea:
- Title: {idea.get('title')}
- Description: {idea.get('description')}
- Problem: {idea.get('problem')}
- Solution: {idea.get('solution')}
- Target Audience: {idea.get('audience')}
- Industry: {idea.get('industry') or idea.get('market')}

Return JSON:
{{
    "match_score": 0-100,
    "verdict": "Strong Match/Good Match/Moderate Match/Weak Match",
    "strengths": ["3 things the founder brings to this idea"],
    "gaps": ["3 skill/experience gaps the founder should address"],
    "recommended_cofounder": "Description of the ideal co-founder",
    "advice": "2-3 sentences of actionable advice"
}}"""

    try:
        result = await asyncio.to_thread(GeminiService.call_gemini, prompt, "founder_match")
        if result["success"]:
            await db.ideas.update_one({"_id": idea["_id"]}, {"$set": {"founder_match_score": result["data"].get("match_score", 0)}})
            return _success(data=result["data"])
        return _error("Analysis is taking longer than usual. Please try again.", 500)
    except Exception:
        return _error("Analysis is taking longer than usual. Please try again.", 500)


@router.post("/{idea_id}/stress-test")
async def stress_test(idea_id: int, current_user: dict = Depends(get_current_user)):
    from app_fastapi import get_db
    from app.services.gemini_service import GeminiService
    db = get_db()
    idea = await _get_idea_or_404(db, idea_id, current_user["id"])
    analysis = idea.get("analysis_data") or {}

    prompt = f"""You are a ruthless but fair venture capitalist stress-testing a startup idea.

Startup Idea:
- Title: {idea.get('title')}
- Description: {idea.get('description')}
- Problem: {idea.get('problem')}
- Solution: {idea.get('solution')}
- Target Audience: {idea.get('audience')}
- Industry: {idea.get('industry') or idea.get('market')}
- Current Score: {analysis.get('overall_score', 'N/A')}/100

Return JSON:
{{
    "stress_score": 0-100,
    "stress_grade": "A/B/C/D/F",
    "devil_questions": [
        {{ "question": "Tough investor question", "why_it_matters": "Why this is a real concern", "suggested_answer": "How the founder should respond" }}
    ],
    "worst_case_scenarios": [
        {{ "scenario": "What could go wrong", "probability": "High/Medium/Low", "mitigation": "How to prevent or handle it" }}
    ],
    "kill_scenarios": ["2-3 things that would completely kill this idea"],
    "survival_tips": ["3-4 specific actions to survive the first year"],
    "final_verdict": "2-3 sentence honest assessment"
}}

Rules:
- Generate 5 devil_questions, 4 worst_case_scenarios
- Be specific to {idea.get('title')}, not generic
- stress_score: higher = more resilient"""

    try:
        result = await asyncio.to_thread(GeminiService.call_gemini, prompt, "stress_test")
        if result["success"]:
            return _success(data=result["data"])
        return _error("Analysis is taking longer than usual. Please try again.", 500)
    except Exception:
        return _error("Analysis is taking longer than usual. Please try again.", 500)


@router.post("/{idea_id}/one-liner")
async def one_line_pitch(idea_id: int, current_user: dict = Depends(get_current_user)):
    from app_fastapi import get_db
    from app.services.gemini_service import GeminiService
    db = get_db()
    idea = await _get_idea_or_404(db, idea_id, current_user["id"])
    analysis = idea.get("analysis_data") or {}

    prompt = f"""Generate 3 different one-line pitch formats for this startup idea.

Idea: {idea.get('title')}
Description: {idea.get('description')}
Problem: {idea.get('problem')}
Solution: {idea.get('solution')}
Target audience: {idea.get('audience')}
Industry: {idea.get('industry') or idea.get('market')}
Score: {analysis.get('overall_score', 'N/A')}/100

Return JSON:
{{
    "pitches": [
        {{ "format": "Twitter Pitch", "template": "...", "pitch": "max 280 chars", "use_case": "When to use" }},
        {{ "format": "Elevator Pitch", "template": "For [audience] who [need]...", "pitch": "max 2 sentences", "use_case": "When to use" }},
        {{ "format": "Investor Hook", "template": "[Industry] is a $[X]B market...", "pitch": "max 2 sentences", "use_case": "When to use" }}
    ]
}}

Each pitch must be specific to {idea.get('title')}. No generic filler."""

    try:
        result = await asyncio.to_thread(GeminiService.call_gemini, prompt, "one_liner")
        if result["success"]:
            return _success(data=result["data"])
        return _error("Analysis is taking longer than usual. Please try again.", 500)
    except Exception:
        return _error("Analysis is taking longer than usual. Please try again.", 500)


# ═══════════════════════════════════════════════════════════════════════════════
# AI Layers Engine
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/layers/start")
async def layers_start(body: LayersStartRequest, current_user: dict = Depends(get_current_user)):
    from app_fastapi import get_db
    from app.services.layers_service import LayersService
    db = get_db()

    try:
        result = await asyncio.to_thread(LayersService.get_first_question, body.initial_idea)
        await db.users.update_one({"id": current_user["id"]}, {"$inc": {"api_credits_used": 1}})
        return _success(data=result, message="First layer question generated")
    except Exception as e:
        return _error(f"Failed to start session: {str(e)}", 500)


@router.post("/layers/chat")
async def layers_chat(body: LayersChatRequest, current_user: dict = Depends(get_current_user)):
    from app_fastapi import get_db
    from app.services.layers_service import LayersService
    db = get_db()

    try:
        result = await asyncio.to_thread(LayersService.get_next_question, body.initial_idea, body.history)
        await db.users.update_one({"id": current_user["id"]}, {"$inc": {"api_credits_used": 1}})
        return _success(data=result, message="Next layer question generated")
    except Exception as e:
        return _error(f"Failed to get next question: {str(e)}", 500)


@router.post("/layers/finalize", status_code=201)
async def layers_finalize(body: LayersFinalizeRequest, current_user: dict = Depends(get_current_user)):
    from app_fastapi import get_db
    from app.services.layers_service import LayersService
    from app.services.idea_analysis_service import IdeaAnalysisService
    db = get_db()

    try:
        synthesized = await asyncio.to_thread(LayersService.synthesize_idea, body.initial_idea, body.history)

        # Create idea from synthesized data
        idea_id = await _get_next_id(db, "ideas")
        idea_doc = {
            "id": idea_id,
            "title": synthesized.get("title", ""), "description": synthesized.get("description", ""),
            "problem": synthesized.get("problem"), "solution": synthesized.get("solution"),
            "audience": synthesized.get("audience"), "market": synthesized.get("market"),
            "industry": synthesized.get("market"),
            "target_market": None, "target_audience": None,
            "user_id": current_user["id"],
            "created_at": datetime.utcnow(), "updated_at": None,
            "stage": "idea", "status": "processing",
            "current_stage": 0, "current_stage_name": "",
            "analysis_status": {"validation": "pending", "market": "pending", "competitors": "pending", "mvp": "pending", "monetization": "pending", "gtm": "pending"},
            "analysis_data": None, "overall_score": None, "risk_level": None,
            "is_public": False, "share_token": None,
            "public_views": 0, "ai_layers_count": 0, "founder_match_score": None,
        }
        await db.ideas.insert_one(idea_doc)

        # Background analysis
        async def _run_analysis_and_credit(idea_id, user_id):
            try:
                await asyncio.to_thread(IdeaAnalysisService.process_idea_analysis, idea_id)
                await db.users.update_one({"id": user_id}, {"$inc": {"api_credits_used": 2}})
            except Exception as e:
                print(f"[Background Analysis] Error for idea #{idea_id}: {e}")

        asyncio.create_task(_run_analysis_and_credit(idea_id, current_user["id"]))

        return _success(data={"idea": _idea_to_dict(idea_doc)}, message="Idea created — analysis started in background", status=201)
    except Exception as e:
        return _error(f"Failed to finalize idea: {str(e)}", 500)


# ─── Improvement Mode ─────────────────────────────────────────────────────────

@router.post("/{idea_id}/layers/improve/start")
async def layers_improve_start(idea_id: int, current_user: dict = Depends(get_current_user)):
    from app_fastapi import get_db
    from app.services.layers_service import LayersService
    db = get_db()
    idea = await _get_idea_or_404(db, idea_id, current_user["id"])
    analysis = idea.get("analysis_data") or {}

    context = f"""Existing Idea: {idea.get('title')}
Description: {idea.get('description')}
Problem: {idea.get('problem')}
Solution: {idea.get('solution')}
Target Audience: {idea.get('audience')}
Market: {idea.get('industry') or idea.get('market')}
Overall Score: {analysis.get('overall_score', 'N/A')}/100
Risk Level: {analysis.get('risk_level', 'Unknown')}
Key Strengths: {', '.join(analysis.get('strengths', [])[:3])}
Key Risks: {', '.join(analysis.get('risks', [])[:3])}
Recommendation: {str(analysis.get('recommendation', ''))[:300]}

This idea has ALREADY been analyzed. The user wants to IMPROVE it.
Focus on the weakest areas and biggest risks identified above."""

    try:
        result = await asyncio.to_thread(LayersService.get_first_question, context)
        return _success(data=result)
    except Exception:
        return _error("Analysis is taking longer than usual. Please try again.", 500)


@router.post("/{idea_id}/layers/improve/chat")
async def layers_improve_chat(idea_id: int, body: LayersImproveChatRequest, current_user: dict = Depends(get_current_user)):
    from app_fastapi import get_db
    from app.services.layers_service import LayersService
    db = get_db()
    idea = await _get_idea_or_404(db, idea_id, current_user["id"])
    analysis = idea.get("analysis_data") or {}

    context = f"""Existing Idea (IMPROVEMENT MODE): {idea.get('title')}
Description: {idea.get('description')}
Problem: {idea.get('problem')}
Solution: {idea.get('solution')}
Target Audience: {idea.get('audience')}
Market: {idea.get('industry') or idea.get('market')}
Score: {analysis.get('overall_score', 'N/A')}/100
Weaknesses to address: {', '.join(analysis.get('risks', [])[:3])}"""

    try:
        result = await asyncio.to_thread(LayersService.get_next_question, context, body.history)
        return _success(data=result)
    except Exception:
        return _error("Analysis is taking longer than usual. Please try again.", 500)


@router.post("/{idea_id}/layers/improve/finalize")
async def layers_improve_finalize(idea_id: int, body: LayersImproveChatRequest, current_user: dict = Depends(get_current_user)):
    from app_fastapi import get_db
    from app.services.layers_service import LayersService
    db = get_db()
    idea = await _get_idea_or_404(db, idea_id, current_user["id"])

    if not body.history:
        return _error("Missing conversation history")

    try:
        context = f"""{idea.get('title')}: {idea.get('description')}
Problem: {idea.get('problem')}
Solution: {idea.get('solution')}
Target Audience: {idea.get('audience')}
Market: {idea.get('industry') or idea.get('market')}"""

        synthesized = await asyncio.to_thread(LayersService.synthesize_idea, context, body.history)

        update = {}
        if synthesized.get("description"): update["description"] = synthesized["description"]
        if synthesized.get("problem"): update["problem"] = synthesized["problem"]
        if synthesized.get("solution"): update["solution"] = synthesized["solution"]
        if synthesized.get("audience"): update["audience"] = synthesized["audience"]
        if synthesized.get("market"): update["market"] = synthesized["market"]
        update["ai_layers_count"] = (idea.get("ai_layers_count") or 0) + 1

        if update:
            await db.ideas.update_one({"_id": idea["_id"]}, {"$set": update})
            idea.update(update)

        return _success(
            data={"idea": _idea_to_dict(idea), "improvements": synthesized},
            message="Idea improved successfully! AI-Refined badge earned."
        )
    except Exception as e:
        return _error(f"Failed to finalize improvements: {str(e)}", 500)


# ═══════════════════════════════════════════════════════════════════════════════
# Competitor Watch
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/{idea_id}/competitor-watch")
async def get_competitor_watch(idea_id: int, current_user: dict = Depends(get_current_user)):
    from app_fastapi import get_db
    db = get_db()
    await _get_idea_or_404(db, idea_id, current_user["id"])

    watch = await db.competitor_watch.find_one({"idea_id": idea_id})
    if not watch:
        return _success(data={"watch": None, "has_watch": False}, message="No competitor watch configured")

    # Count unread alerts
    unread = await db.competitor_alerts.count_documents({"watch_id": watch["id"], "is_read": False})
    wd = {k: v for k, v in watch.items() if k != "_id"}
    for key in ("last_scan_at", "created_at"):
        if isinstance(wd.get(key), datetime):
            wd[key] = wd[key].isoformat()
    wd["unread_alerts_count"] = unread

    return _success(data={"watch": wd, "has_watch": True}, message="Competitor watch retrieved")


@router.post("/{idea_id}/competitor-watch")
async def create_or_update_competitor_watch(idea_id: int, body: CompetitorWatchRequest, current_user: dict = Depends(get_current_user)):
    from app_fastapi import get_db
    from app.services.competitor_monitoring_service import CompetitorMonitoringService
    db = get_db()
    await _get_idea_or_404(db, idea_id, current_user["id"])

    try:
        watch = await db.competitor_watch.find_one({"idea_id": idea_id})
        if watch:
            update = {}
            if body.is_active is not None: update["is_active"] = body.is_active
            if body.scan_frequency is not None: update["scan_frequency"] = body.scan_frequency
            if body.keywords is not None: update["keywords"] = body.keywords
            if update:
                await db.competitor_watch.update_one({"_id": watch["_id"]}, {"$set": update})
                watch.update(update)
        else:
            result = await asyncio.to_thread(CompetitorMonitoringService.create_watch_for_idea, idea_id)
            if "error" in result:
                return _error(result["error"])
            watch = await db.competitor_watch.find_one({"idea_id": idea_id})

        wd = {k: v for k, v in watch.items() if k != "_id"}
        for key in ("last_scan_at", "created_at"):
            if isinstance(wd.get(key), datetime):
                wd[key] = wd[key].isoformat()

        return _success(data={"watch": wd}, message="Competitor watch configured successfully")
    except Exception as e:
        return _error(f"Internal error: {str(e)}", 500)


@router.delete("/{idea_id}/competitor-watch")
async def delete_competitor_watch(idea_id: int, current_user: dict = Depends(get_current_user)):
    from app_fastapi import get_db
    db = get_db()
    await _get_idea_or_404(db, idea_id, current_user["id"])

    watch = await db.competitor_watch.find_one({"idea_id": idea_id})
    if not watch:
        return _error("No watch found", 404)

    await db.competitor_alerts.delete_many({"watch_id": watch["id"]})
    await db.competitor_watch.delete_one({"_id": watch["_id"]})
    return _success(message="Competitor watch deleted")


@router.get("/{idea_id}/alerts")
async def get_competitor_alerts(
    idea_id: int,
    unread_only: bool = False,
    limit: int = Query(50, ge=1, le=200),
    current_user: dict = Depends(get_current_user),
):
    from app_fastapi import get_db
    db = get_db()
    await _get_idea_or_404(db, idea_id, current_user["id"])

    watch = await db.competitor_watch.find_one({"idea_id": idea_id})
    if not watch:
        return _success(data={"alerts": [], "total": 0}, message="No watch configured")

    query = {"watch_id": watch["id"]}
    if unread_only:
        query["is_read"] = False

    alerts = []
    unread_count = 0
    async for a in db.competitor_alerts.find(query).sort("discovered_at", -1).limit(limit):
        ad = {k: v for k, v in a.items() if k != "_id"}
        if isinstance(ad.get("discovered_at"), datetime):
            ad["discovered_at"] = ad["discovered_at"].isoformat()
        alerts.append(ad)
        if not ad.get("is_read"):
            unread_count += 1

    return _success(data={"alerts": alerts, "total": len(alerts), "unread_count": unread_count}, message="Alerts retrieved")


@router.patch("/alerts/{alert_id}/read")
async def mark_alert_read(alert_id: int, current_user: dict = Depends(get_current_user)):
    from app_fastapi import get_db
    db = get_db()

    alert = await db.competitor_alerts.find_one({"id": alert_id})
    if not alert:
        return _error("Alert not found", 404)

    watch = await db.competitor_watch.find_one({"id": alert.get("watch_id")})
    if not watch:
        return _error("Watch not found", 404)

    idea = await db.ideas.find_one({"id": watch.get("idea_id")})
    if not idea or idea.get("user_id") != current_user["id"]:
        return _error("Unauthorized", 403)

    await db.competitor_alerts.update_one({"_id": alert["_id"]}, {"$set": {"is_read": True}})
    alert["is_read"] = True
    ad = {k: v for k, v in alert.items() if k != "_id"}
    if isinstance(ad.get("discovered_at"), datetime):
        ad["discovered_at"] = ad["discovered_at"].isoformat()

    return _success(data={"alert": ad}, message="Alert marked as read")


@router.post("/{idea_id}/competitor-watch/scan")
async def trigger_competitor_scan(idea_id: int, current_user: dict = Depends(get_current_user)):
    from app_fastapi import get_db
    from app.services.competitor_monitoring_service import CompetitorMonitoringService
    db = get_db()
    await _get_idea_or_404(db, idea_id, current_user["id"])

    watch = await db.competitor_watch.find_one({"idea_id": idea_id})
    if not watch:
        return _error("No watch configured", 404)

    result = await asyncio.to_thread(CompetitorMonitoringService.scan_competitors, watch["id"])
    if "error" in result:
        return _error(result["error"])

    return _success(data=result, message=f"Scan completed. Found {result.get('new_alerts', 0)} new alerts.")


# ═══════════════════════════════════════════════════════════════════════════════
# File / Voice Upload
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/upload/voice")
async def upload_voice(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    from app_fastapi import get_db
    from app.services.gemini_service import GeminiService
    db = get_db()

    try:
        file_data = await file.read()
        mime_type = file.content_type or "audio/wav"
        system_instruction = """You are an expert transcriber. Extract the EXACT text verbatim.
Output JSON format: {"title": "", "description": "exact transcribed text here"}"""

        extracted = await asyncio.to_thread(
            GeminiService.extract_idea_from_media,
            mime_type=mime_type, data=file_data,
            prompt="Transcribe this audio recording EXACTLY. Return valid JSON only.",
            system_instruction=system_instruction,
        )

        cleaned = extracted.replace("```json", "").replace("```", "").strip()
        idea_data = json.loads(cleaned)
        await db.users.update_one({"id": current_user["id"]}, {"$inc": {"api_credits_used": 1}})
        return _success(data=idea_data, message="Voice processed successfully")
    except Exception as e:
        return _error(f"Failed to process voice: {str(e)}", 500)


@router.post("/upload/file")
async def upload_file(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    from app_fastapi import get_db
    from app.services.gemini_service import GeminiService
    db = get_db()

    try:
        file_data = await file.read()
        mime_type = file.content_type or "application/pdf"
        system_instruction = """You are an expert text extractor. Extract the EXACT text verbatim.
Output JSON format: {"title": "", "description": "exact extracted text here"}"""

        extracted = await asyncio.to_thread(
            GeminiService.extract_idea_from_media,
            mime_type=mime_type, data=file_data,
            prompt="Extract the EXACT text from this file verbatim. Return valid JSON only.",
            system_instruction=system_instruction,
        )

        cleaned = extracted.replace("```json", "").replace("```", "").strip()
        idea_data = json.loads(cleaned)
        await db.users.update_one({"id": current_user["id"]}, {"$inc": {"api_credits_used": 1}})
        return _success(data=idea_data, message="File processed successfully")
    except Exception as e:
        return _error(f"Failed to process file: {str(e)}", 500)
