"""
Idea Export Router — PDF and PPT download/export endpoints.

Endpoints:
    GET  /api/ideas/{id}/download       — Download full PDF analysis
    GET  /api/ideas/{id}/download-ppt   — Download default PPT
    POST /api/ideas/{id}/export/ppt     — Export themed PPT with options
    POST /api/ideas/{id}/export/pdf     — Export branded PDF with options
"""

import asyncio
import json
import os
import tempfile
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel

from app_fastapi.dependencies import get_current_user

router = APIRouter()


class ExportPPTRequest(BaseModel):
    theme: str = "dark_executive"
    sections: Optional[list] = None
    font: Optional[str] = None
    layout: Optional[str] = None
    include_charts: bool = True

class ExportPDFRequest(BaseModel):
    sections: Optional[list] = None
    font: Optional[str] = None


async def _get_idea_or_404(db, idea_id: int, user_id: int) -> dict:
    idea = await db.ideas.find_one({"id": idea_id})
    if not idea or idea.get("user_id") != user_id:
        raise HTTPException(status_code=404, detail="Idea not found")
    return idea


async def _build_export_data(db, idea: dict) -> dict:
    """Build full analysis_data dict from idea + stage_results for export."""
    stages = {}
    async for sr in db.stage_results.find({"idea_id": idea["id"]}):
        rj = sr.get("result_json")
        try:
            stages[sr["stage_name"]] = rj if isinstance(rj, dict) else json.loads(rj or "{}")
        except Exception:
            stages[sr.get("stage_name", "unknown")] = {}

    return {
        "id": idea["id"],
        "title": idea.get("title", ""),
        "description": idea.get("description", ""),
        "one_liner": idea.get("one_liner", ""),
        "industry": idea.get("industry") or idea.get("market") or "",
        "overall_score": idea.get("overall_score", 0),
        "stages": stages,
    }


@router.get("/{idea_id}/download")
async def download_report(idea_id: int, current_user: dict = Depends(get_current_user)):
    """Download full PDF analysis report."""
    from app_fastapi import get_db
    from app.services.pdf_service import generate_analysis_pdf
    db = get_db()

    idea = await _get_idea_or_404(db, idea_id, current_user["id"])

    try:
        analysis_data = await _build_export_data(db, idea)
        file_path = await asyncio.to_thread(generate_analysis_pdf, analysis_data)
        safe_title = idea.get("title", "Report").replace(" ", "_")[:50]
        return FileResponse(
            path=file_path,
            filename=f"{safe_title}-Full-Analysis.pdf",
            media_type="application/pdf",
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF: {str(e)}")


@router.get("/{idea_id}/download-ppt")
async def download_ppt(idea_id: int, current_user: dict = Depends(get_current_user)):
    """Download default dark_executive PPT."""
    from app_fastapi import get_db
    from app.services.ppt_service import generate_investor_ppt
    db = get_db()

    idea = await _get_idea_or_404(db, idea_id, current_user["id"])

    try:
        analysis_data = await _build_export_data(db, idea)
        file_path = await asyncio.to_thread(generate_investor_ppt, analysis_data, "dark_executive")
        safe_title = idea.get("title", "Presentation").replace(" ", "_")[:50]
        return FileResponse(
            path=file_path,
            filename=f"{safe_title}-Presentation.pptx",
            media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to generate PPT: {str(e)}")


@router.post("/{idea_id}/export/ppt")
async def export_ppt(idea_id: int, body: ExportPPTRequest, current_user: dict = Depends(get_current_user)):
    """Export themed PPT with customization options."""
    from app_fastapi import get_db
    from app.services.ppt_service import generate_investor_ppt
    db = get_db()

    idea = await _get_idea_or_404(db, idea_id, current_user["id"])

    try:
        analysis_data = await _build_export_data(db, idea)
        analysis_data["_export_sections"] = body.sections
        analysis_data["_export_font"] = body.font
        analysis_data["_export_layout"] = body.layout
        analysis_data["_export_include_charts"] = body.include_charts
        file_path = await asyncio.to_thread(generate_investor_ppt, analysis_data, body.theme)
        safe_title = idea.get("title", "Deck").replace(" ", "_")[:50]
        return FileResponse(
            path=file_path,
            filename=f"{safe_title}-InvestorDeck.pptx",
            media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to generate PPT: {str(e)}")


@router.post("/{idea_id}/export/pdf")
async def export_pdf(idea_id: int, body: ExportPDFRequest, current_user: dict = Depends(get_current_user)):
    """Export branded PDF with optional section filtering."""
    from app_fastapi import get_db
    from app.services.pdf_service import generate_analysis_pdf
    db = get_db()

    idea = await _get_idea_or_404(db, idea_id, current_user["id"])

    try:
        analysis_data = await _build_export_data(db, idea)
        analysis_data["_export_sections"] = body.sections
        analysis_data["_export_font"] = body.font
        file_path = await asyncio.to_thread(generate_analysis_pdf, analysis_data)
        safe_title = idea.get("title", "Report").replace(" ", "_")[:50]
        return FileResponse(
            path=file_path,
            filename=f"{safe_title}-Analysis.pdf",
            media_type="application/pdf",
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF: {str(e)}")
