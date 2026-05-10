from flask import Blueprint, request, jsonify, send_file
from app.services.idea_analysis_service import IdeaAnalysisService
from app.services.gemini_service import GeminiService
from app.services.pdf_service import generate_analysis_pdf
from app.services.ppt_service import generate_investor_ppt
from app.services.market_service import MarketService
from app.services.competitor_monitoring_service import CompetitorMonitoringService
from app.models.user_model import Idea, Comment, StageResult, User
from app.models.competitor_model import CompetitorWatch, CompetitorAlert
from app.middleware.auth_middleware import token_required
from app.utils.response_formatter import ResponseFormatter
from app.utils.sanitize import sanitize_idea_data, sanitize_input
from app import limiter
import os
import json
import secrets

idea_bp = Blueprint('idea', __name__)

@idea_bp.route('/', methods=['POST'])
@token_required
def create_idea(current_user):
    import threading
    data = request.get_json()
    if not data:
        return ResponseFormatter.error("Missing request data")
    
    clean_data = sanitize_idea_data(data)
    idea = IdeaAnalysisService.create_idea(current_user.id, clean_data)

    # Mark as processing immediately
    idea.status = 'processing'
    idea.current_stage = 0
    idea.current_stage_name = ''
    idea.save()

    # Run analysis in background thread
    from flask import current_app
    app = current_app._get_current_object()

    def run_analysis(app_ctx, idea_id):
        with app_ctx.app_context():
            try:
                IdeaAnalysisService.process_idea_analysis(idea_id)
            except Exception as e:
                print(f"[Background Analysis] Error for idea #{idea_id}: {e}")

    thread = threading.Thread(target=run_analysis, args=(app, idea.id), daemon=True)
    thread.start()
    
    return ResponseFormatter.success(
        data={'idea': idea.to_dict()},
        message="Idea created — analysis started",
        status=201
    )

@idea_bp.route('/', methods=['GET'])
@token_required
def get_user_ideas(current_user):
    ideas = Idea.find_by_user(current_user.id)
    return ResponseFormatter.success(
        data={'ideas': [idea.to_dict() for idea in ideas]}
    )

@idea_bp.route('/<int:idea_id>', methods=['GET'])
@token_required
def get_idea(current_user, idea_id):
    idea = Idea.find_by_id(idea_id)
    if not idea or idea.user_id != current_user.id:
        return ResponseFormatter.error("Idea not found", status=404)
    
    return ResponseFormatter.success(data={'idea': idea.to_dict()})


@idea_bp.route('/<int:idea_id>/visibility', methods=['PATCH'])
@token_required
def toggle_visibility(current_user, idea_id):
    """Toggle public/private visibility and generate share token if needed."""
    idea = Idea.find_by_id(idea_id)
    if not idea or idea.user_id != current_user.id:
        return ResponseFormatter.error("Idea not found", status=404)

    data = request.get_json(silent=True) or {}
    is_public = data.get('is_public', not idea.is_public)
    idea.is_public = is_public

    # Always generate a new token
    idea.share_token = secrets.token_urlsafe(32)
    idea.save()

    return ResponseFormatter.success(data={'idea': idea.to_dict()})


@idea_bp.route('/public', methods=['GET'])
def get_public_ideas():
    """Get all public ideas for the Explore page — no auth required."""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 12, type=int)
    industry = request.args.get('industry', '')
    sort = request.args.get('sort', 'newest')

    items, total, pages = Idea.find_public(page=page, per_page=per_page, industry=industry, sort=sort)

    from app.models.user_model import User
    ideas_data = []
    for idea in items:
        user = User.find_by_id(idea.user_id)
        ideas_data.append({
            "id": idea.id,
            "title": idea.title,
            "description": idea.description[:150] if idea.description else "",
            "industry": idea.industry or idea.market or "",
            "overall_score": idea.overall_score,
            "share_token": idea.share_token,
            "public_views": idea.public_views or 0,
            "created_at": idea.created_at.isoformat() if hasattr(idea.created_at, 'isoformat') else str(idea.created_at),
            "founder_id": idea.user_id,
            "founder_name": f"{user.first_name}" if user else "Anonymous",
            "founder_initial": user.first_name[0].upper() if user and user.first_name else "A",
        })

    return ResponseFormatter.success(data={
        "ideas": ideas_data,
        "total": total,
        "pages": pages,
        "current_page": page,
    })

@idea_bp.route('/<int:idea_id>/download', methods=['GET'])
@token_required
def download_report(current_user, idea_id):
    idea = Idea.find_by_id(idea_id)
    if not idea or idea.user_id != current_user.id:
        return ResponseFormatter.error("Idea not found", status=404)
        
    try:
        analysis_data = _build_idea_export_data(idea)
        file_path = generate_analysis_pdf(analysis_data)
        return send_file(
            file_path,
            as_attachment=True,
            download_name=f"{idea.title.replace(' ', '_')}-Full-Analysis.pdf"
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        return ResponseFormatter.error(f"Failed to generate PDF: {str(e)}", status=500)

@idea_bp.route('/<int:idea_id>/download-ppt', methods=['GET'])
@token_required
def download_ppt(current_user, idea_id):
    idea = Idea.find_by_id(idea_id)
    if not idea or idea.user_id != current_user.id:
        return ResponseFormatter.error("Idea not found", status=404)
        
    try:
        analysis_data = _build_idea_export_data(idea)
        file_path = generate_investor_ppt(analysis_data, "dark_executive")
        return send_file(
            file_path,
            as_attachment=True,
            download_name=f"{idea.title.replace(' ', '_')}-Presentation.pptx"
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        return ResponseFormatter.error(f"Failed to generate PPT: {str(e)}", status=500)


def _build_idea_export_data(idea):
    """Build full analysis_data dict from idea object for export services."""
    stage_results = StageResult.find_by_idea(idea.id)
    stages = {}
    for sr in stage_results:
        try:
            stages[sr.stage_name] = sr.result_json if isinstance(sr.result_json, dict) else json.loads(sr.result_json or "{}")
        except Exception:
            stages[sr.stage_name] = {}

    return {
        "id": idea.id,
        "title": idea.title,
        "description": idea.description or "",
        "one_liner": getattr(idea, "one_liner", "") or "",
        "industry": idea.industry or getattr(idea, "market", "") or "",
        "overall_score": idea.overall_score or 0,
        "stages": stages,
    }


@idea_bp.route('/<int:idea_id>/export/ppt', methods=['POST'])
@token_required
def export_ppt(current_user, idea_id):
    """Export themed PPT with customization options."""
    idea = Idea.find_by_id(idea_id)
    if not idea or idea.user_id != current_user.id:
        return ResponseFormatter.error("Idea not found", status=404)

    body = request.get_json() or {}
    theme = body.get("theme", "dark_executive")
    sections = body.get("sections", None)  # list of section keys or None for all
    font = body.get("font", None)
    layout = body.get("layout", None)
    include_charts = body.get("include_charts", True)

    try:
        analysis_data = _build_idea_export_data(idea)
        # Pass customization options
        analysis_data["_export_sections"] = sections
        analysis_data["_export_font"] = font
        analysis_data["_export_layout"] = layout
        analysis_data["_export_include_charts"] = include_charts
        file_path = generate_investor_ppt(analysis_data, theme)
        safe_title = idea.title.replace(" ", "_")[:50]
        return send_file(
            file_path,
            as_attachment=True,
            mimetype="application/vnd.openxmlformats-officedocument.presentationml.presentation",
            download_name=f"{safe_title}-InvestorDeck.pptx"
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        return ResponseFormatter.error(f"Failed to generate PPT: {str(e)}", status=500)


@idea_bp.route('/<int:idea_id>/export/pdf', methods=['POST'])
@token_required
def export_pdf(current_user, idea_id):
    """Export branded PDF analysis report with optional section filtering."""
    idea = Idea.find_by_id(idea_id)
    if not idea or idea.user_id != current_user.id:
        return ResponseFormatter.error("Idea not found", status=404)

    body = request.get_json() or {}
    sections = body.get("sections", None)  # list of section keys or None for all
    font = body.get("font", None)

    try:
        analysis_data = _build_idea_export_data(idea)
        analysis_data["_export_sections"] = sections
        analysis_data["_export_font"] = font
        file_path = generate_analysis_pdf(analysis_data)
        safe_title = idea.title.replace(" ", "_")[:50]
        return send_file(
            file_path,
            as_attachment=True,
            mimetype="application/pdf",
            download_name=f"{safe_title}-Analysis.pdf"
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        return ResponseFormatter.error(f"Failed to generate PDF: {str(e)}", status=500)

@idea_bp.route('/<int:idea_id>/status', methods=['GET'])
@token_required
def get_idea_status(current_user, idea_id):
    """Get real-time analysis progress for stage tracker UI."""
    idea = Idea.find_by_id(idea_id)
    if not idea or idea.user_id != current_user.id:
        return ResponseFormatter.error("Idea not found", status=404)

    # Get completed stages from DB
    completed_stages = []
    stage_results = StageResult.find_by_idea(idea_id)
    for sr in stage_results:
        completed_stages.append(sr.stage_name)

    return jsonify({
        "status": getattr(idea, 'status', 'pending'),
        "current_stage": getattr(idea, 'current_stage', 0),
        "current_stage_name": getattr(idea, 'current_stage_name', ''),
        "completed_stages": completed_stages,
        "overall_score": idea.overall_score or 0,
    }), 200


@idea_bp.route('/<int:idea_id>/investor-pitch', methods=['POST'])
@token_required
def generate_investor_pitches(current_user, idea_id):
    idea = Idea.find_by_id(idea_id)
    if not idea or idea.user_id != current_user.id:
        return ResponseFormatter.error("Idea not found", status=404)
        
    pitches = IdeaAnalysisService.generate_investor_pitches(idea.id)
    
    if isinstance(pitches, dict) and 'error' in pitches:
        return ResponseFormatter.error(pitches['error'], status=500)
        
    return ResponseFormatter.success(
        data={'pitches': pitches},
        message="Investor pitches generated successfully"
    )


@idea_bp.route('/<int:idea_id>/research-hub', methods=['POST'])
@token_required
def generate_research_hub(current_user, idea_id):
    idea = Idea.find_by_id(idea_id)
    if not idea or idea.user_id != current_user.id:
        return ResponseFormatter.error("Idea not found", status=404)

    hub_data = IdeaAnalysisService.generate_research_hub(idea.id)

    if isinstance(hub_data, dict) and 'error' in hub_data:
        return ResponseFormatter.error(hub_data['error'], status=500)

    # Only charge a credit if it was freshly generated (not cached)
    if not (idea.analysis_data and "research_hub" in (idea.analysis_data or {})):
        current_user.api_credits_used += 1
        current_user.save()

    return ResponseFormatter.success(
        data={'hub': hub_data},
        message="Research hub generated successfully"
    )


@idea_bp.route('/<int:idea_id>', methods=['DELETE'])
@token_required
def delete_idea(current_user, idea_id):
    success = IdeaAnalysisService.delete_idea(idea_id, current_user.id)
    if success:
        return ResponseFormatter.success(message="Idea deleted successfully")
    return ResponseFormatter.error("Idea not found or unauthorized", status=404)

@idea_bp.route('/<int:idea_id>/reanalyze', methods=['POST'])
@token_required
def reanalyze_idea(current_user, idea_id):
    import threading
    idea = Idea.find_by_id(idea_id)
    if not idea or idea.user_id != current_user.id:
        return ResponseFormatter.error("Idea not found", status=404)
    
    # Mark as processing immediately
    idea.status = 'processing'
    idea.current_stage = 0
    idea.current_stage_name = ''
    idea.save()

    # Run analysis in background thread
    from flask import current_app
    app = current_app._get_current_object()

    def run_analysis(app_ctx, idea_id):
        with app_ctx.app_context():
            try:
                IdeaAnalysisService.process_idea_analysis(idea_id)
            except Exception as e:
                print(f"[Background Analysis] Error for idea #{idea_id}: {e}")

    thread = threading.Thread(target=run_analysis, args=(app, idea.id), daemon=True)
    thread.start()

    return ResponseFormatter.success(
        data={'idea': idea.to_dict()},
        message="Re-analysis started"
    )

@idea_bp.route('/<int:idea_id>/market/research', methods=['POST'])
@token_required
def fetch_market_research(current_user, idea_id):
    idea = Idea.find_by_id(idea_id)
    if not idea or idea.user_id != current_user.id:
        return ResponseFormatter.error("Idea not found", status=404)
        
    results = MarketService.fetch_market_data(idea.id)
    if isinstance(results, dict) and "error" in results:
        return ResponseFormatter.error(results["error"], status=500)
        
    return ResponseFormatter.success(
        data={'market_data': results},
        message="Market data fetched successfully"
    )

@idea_bp.route('/upload/voice', methods=['POST'])
@token_required
def upload_voice(current_user):
    if 'file' not in request.files:
        return ResponseFormatter.error("No file part")
    
    file = request.files['file']
    if file.filename == '':
        return ResponseFormatter.error("No selected file")
        
    try:
        file_data = file.read()
        mime_type = file.content_type or "audio/wav"
        
        system_instruction = """You are an expert transcriber. Your job is to extract the EXACT text from the provided input verbatim. Do not summarize, outline, or alter the text.
Output JSON format:
{
    "title": "",
    "description": "exact transcribed text here"
}"""
        extracted_text = GeminiService.extract_idea_from_media(
            mime_type=mime_type, 
            data=file_data,
            prompt="Transcribe this audio recording EXACTLY. Return valid JSON only.",
            system_instruction=system_instruction
        )
        
        cleaned_json = extracted_text.replace('```json', '').replace('```', '').strip()
        idea_data = json.loads(cleaned_json)
        
        current_user.api_credits_used += 1
        current_user.save()
        
        return ResponseFormatter.success(
            data=idea_data,
            message="Voice processed successfully"
        )
        
    except Exception as e:
        print(f"Voice processing error: {str(e)}")
        return ResponseFormatter.error(f"Failed to process voice: {str(e)}", status=500)

@idea_bp.route('/upload/file', methods=['POST'])
@token_required
def upload_file(current_user):
    if 'file' not in request.files:
        return ResponseFormatter.error("No file part")
    
    file = request.files['file']
    if file.filename == '':
        return ResponseFormatter.error("No selected file")
        
    try:
        file_data = file.read()
        mime_type = file.content_type or "application/pdf"
        
        system_instruction = """You are an expert text extractor. Your job is to extract the EXACT text from the provided document, image, or presentation verbatim. Do not summarize, outline, or alter the text.
Output JSON format:
{
    "title": "",
    "description": "exact extracted text here"
}"""
        extracted_text = GeminiService.extract_idea_from_media(
            mime_type=mime_type, 
            data=file_data,
            prompt="Extract the EXACT text from this file verbatim. Return valid JSON only.",
            system_instruction=system_instruction
        )
        
        cleaned_json = extracted_text.replace('```json', '').replace('```', '').strip()
        idea_data = json.loads(cleaned_json)
        
        current_user.api_credits_used += 1
        current_user.save()
        
        return ResponseFormatter.success(
            data=idea_data,
            message="File processed successfully"
        )
        
    except Exception as e:
        print(f"File processing error: {str(e)}")
        return ResponseFormatter.error(f"Failed to process file: {str(e)}", status=500)


# ============================================
# Bonus Features — Founder Match, Stress Test, Pitch Formula
# ============================================

@idea_bp.route('/<int:idea_id>/founder-match', methods=['POST'])
@token_required
def founder_match_score(current_user, idea_id):
    """Generate a Founder-Idea Match Score based on the user's profile and idea."""
    idea = Idea.find_by_id(idea_id)
    if not idea or idea.user_id != current_user.id:
        return ResponseFormatter.error("Idea not found", status=404)

    prompt = f"""You are evaluating how well a founder matches their startup idea.

Founder Profile:
- Name: {current_user.first_name} {current_user.last_name}
- Skills: {current_user.skills or 'Not specified'}
- Bio: {current_user.bio or 'Not specified'}
- Looking for: {current_user.looking_for or 'Not specified'}

Startup Idea:
- Title: {idea.title}
- Description: {idea.description}
- Problem: {idea.problem}
- Solution: {idea.solution}
- Target Audience: {idea.audience}
- Industry: {idea.industry or idea.market}

Return JSON:
{{
    "match_score": 0-100,
    "verdict": "Strong Match/Good Match/Moderate Match/Weak Match",
    "strengths": ["3 things the founder brings to this idea"],
    "gaps": ["3 skill/experience gaps the founder should address"],
    "recommended_cofounder": "Description of the ideal co-founder to complement this founder for this specific idea",
    "advice": "2-3 sentences of actionable advice for the founder"
}}"""

    try:
        result = GeminiService.call_gemini(prompt, "founder_match")
        if result["success"]:
            match_data = result["data"]
            idea.founder_match_score = match_data.get("match_score", 0)
            idea.save()
            return ResponseFormatter.success(data=match_data)
        else:
            return ResponseFormatter.error("Analysis is taking longer than usual. Please try again.", status=500)
    except Exception as e:
        return ResponseFormatter.error("Analysis is taking longer than usual. Please try again.", status=500)


@idea_bp.route('/<int:idea_id>/stress-test', methods=['POST'])
@token_required
def stress_test(current_user, idea_id):
    """AI Stress Test — plays devil's advocate against the idea."""
    idea = Idea.find_by_id(idea_id)
    if not idea or idea.user_id != current_user.id:
        return ResponseFormatter.error("Idea not found", status=404)

    analysis = idea.analysis_data or {}

    prompt = f"""You are a ruthless but fair venture capitalist stress-testing a startup idea.
Your job is to find every possible weakness, risk, and failure mode.
Be brutally honest but constructive — point out problems AND suggest fixes.

Startup Idea:
- Title: {idea.title}
- Description: {idea.description}
- Problem: {idea.problem}
- Solution: {idea.solution}
- Target Audience: {idea.audience}
- Industry: {idea.industry or idea.market}
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
    "final_verdict": "2-3 sentence honest assessment of whether this idea can survive real-world pressure"
}}

Rules:
- Generate 5 devil_questions that real investors would ask
- Generate 4 worst_case_scenarios
- Be specific to {idea.title}, not generic startup advice
- stress_score: higher = more resilient (100 = practically bulletproof, 0 = will fail immediately)"""

    try:
        result = GeminiService.call_gemini(prompt, "stress_test")
        if result["success"]:
            return ResponseFormatter.success(data=result["data"])
        else:
            return ResponseFormatter.error("Analysis is taking longer than usual. Please try again.", status=500)
    except Exception as e:
        return ResponseFormatter.error("Analysis is taking longer than usual. Please try again.", status=500)


@idea_bp.route('/<int:idea_id>/one-liner', methods=['POST'])
@token_required
def one_line_pitch(current_user, idea_id):
    """Generate 3 one-line pitch formulas for the idea."""
    idea = Idea.find_by_id(idea_id)
    if not idea or idea.user_id != current_user.id:
        return ResponseFormatter.error("Idea not found", status=404)

    analysis = idea.analysis_data or {}

    prompt = f"""Generate 3 different one-line pitch formats for this startup idea.

Idea: {idea.title}
Description: {idea.description}
Problem: {idea.problem}
Solution: {idea.solution}
Target audience: {idea.audience}
Industry: {idea.industry or idea.market}
Score: {analysis.get('overall_score', 'N/A')}/100

Return JSON:
{{
    "pitches": [
        {{
            "format": "Twitter Pitch",
            "template": "The naming template used",
            "pitch": "The actual one-liner (max 280 chars)",
            "use_case": "When to use this pitch"
        }},
        {{
            "format": "Elevator Pitch",
            "template": "For [audience] who [need], [product] is a [category] that [benefit]. Unlike [alternative], we [differentiator].",
            "pitch": "The actual elevator pitch (max 2 sentences)",
            "use_case": "When to use this pitch"
        }},
        {{
            "format": "Investor Hook",
            "template": "[Industry] is a $[X]B market. [Surprising stat]. We're building [solution] to [outcome].",
            "pitch": "The actual investor hook (max 2 sentences)",
            "use_case": "When to use this pitch"
        }}
    ]
}}

Each pitch must be specific to {idea.title}. No generic filler."""

    try:
        result = GeminiService.call_gemini(prompt, "one_liner")
        if result["success"]:
            return ResponseFormatter.success(data=result["data"])
        else:
            return ResponseFormatter.error("Analysis is taking longer than usual. Please try again.", status=500)
    except Exception as e:
        return ResponseFormatter.error("Analysis is taking longer than usual. Please try again.", status=500)


# ============================================
# AI Layers Engine Endpoints
# ============================================

@idea_bp.route('/layers/start', methods=['POST'])
@token_required
def layers_start(current_user):
    """Start an AI Layers Engine session with a seed idea and get the first question."""
    from app.services.layers_service import LayersService
    data = request.get_json(silent=True) or {}
    initial_idea = data.get('initial_idea', '').strip()

    if not initial_idea:
        return ResponseFormatter.error("Please provide an initial idea to start.")

    try:
        result = LayersService.get_first_question(initial_idea)
        current_user.api_credits_used += 1
        current_user.save()
        return ResponseFormatter.success(data=result, message="First layer question generated")
    except Exception as e:
        print(f"Layers start error: {str(e)}")
        return ResponseFormatter.error(f"Failed to start session: {str(e)}", status=500)


@idea_bp.route('/layers/chat', methods=['POST'])
@token_required
def layers_chat(current_user):
    """Continue the Layers session — give the last answer, get the next question."""
    from app.services.layers_service import LayersService
    data = request.get_json(silent=True) or {}
    initial_idea = data.get('initial_idea', '').strip()
    history = data.get('history', [])

    if not initial_idea:
        return ResponseFormatter.error("Missing initial_idea")
    if not history:
        return ResponseFormatter.error("Missing conversation history")

    try:
        result = LayersService.get_next_question(initial_idea, history)
        current_user.api_credits_used += 1
        current_user.save()
        return ResponseFormatter.success(data=result, message="Next layer question generated")
    except Exception as e:
        print(f"Layers chat error: {str(e)}")
        return ResponseFormatter.error(f"Failed to get next question: {str(e)}", status=500)


@idea_bp.route('/layers/finalize', methods=['POST'])
@token_required
def layers_finalize(current_user):
    """Synthesize the conversation into a full Idea and trigger analysis."""
    from app.services.layers_service import LayersService
    import threading
    data = request.get_json(silent=True) or {}
    initial_idea = data.get('initial_idea', '').strip()
    history = data.get('history', [])

    if not initial_idea:
        return ResponseFormatter.error("Missing initial_idea")

    try:
        synthesized = LayersService.synthesize_idea(initial_idea, history)
        idea = IdeaAnalysisService.create_idea(current_user.id, synthesized)

        # Mark as processing immediately
        idea.status = 'processing'
        idea.current_stage = 0
        idea.current_stage_name = ''
        idea.save()

        # Run analysis in background thread so response returns immediately
        # This lets the frontend StageTracker poll and show real-time progress
        from flask import current_app
        app = current_app._get_current_object()

        def run_analysis(app_ctx, idea_id, user_id):
            with app_ctx.app_context():
                try:
                    IdeaAnalysisService.process_idea_analysis(idea_id)
                    # Update user credits after successful analysis
                    user = User.find_by_id(user_id)
                    if user:
                        user.api_credits_used += 2
                        user.save()
                except Exception as e:
                    print(f"[Background Analysis] Error for idea #{idea_id}: {e}")
                    import traceback
                    traceback.print_exc()

        thread = threading.Thread(
            target=run_analysis,
            args=(app, idea.id, current_user.id),
            daemon=True
        )
        thread.start()

        return ResponseFormatter.success(
            data={'idea': idea.to_dict()},
            message="Idea created — analysis started in background",
            status=201
        )
    except Exception as e:
        print(f"Layers finalize error: {str(e)}")
        return ResponseFormatter.error(f"Failed to finalize idea: {str(e)}", status=500)


# ============================================
# AI Layers — Improvement Mode (post-analysis refinement)
# ============================================

@idea_bp.route('/<int:idea_id>/layers/improve/start', methods=['POST'])
@token_required
def layers_improve_start(current_user, idea_id):
    """Start an AI Layers improvement session for an existing, analyzed idea."""
    from app.services.layers_service import LayersService
    idea = Idea.find_by_id(idea_id)
    if not idea or idea.user_id != current_user.id:
        return ResponseFormatter.error("Idea not found", status=404)

    analysis = idea.analysis_data or {}

    context = f"""Existing Idea: {idea.title}
Description: {idea.description}
Problem: {idea.problem}
Solution: {idea.solution}
Target Audience: {idea.audience}
Market: {idea.industry or idea.market}
Overall Score: {analysis.get('overall_score', 'N/A')}/100
Risk Level: {analysis.get('risk_level', 'Unknown')}
Key Strengths: {', '.join(analysis.get('strengths', [])[:3])}
Key Risks: {', '.join(analysis.get('risks', [])[:3])}
Recommendation: {str(analysis.get('recommendation', ''))[:300]}

This idea has ALREADY been analyzed. The user wants to IMPROVE it.
Focus on the weakest areas and biggest risks identified above.
Ask targeted improvement questions."""

    try:
        result = LayersService.get_first_question(context)
        return ResponseFormatter.success(data=result)
    except Exception as e:
        print(f"Layers improve start error: {str(e)}")
        return ResponseFormatter.error("Analysis is taking longer than usual. Please try again.", status=500)


@idea_bp.route('/<int:idea_id>/layers/improve/chat', methods=['POST'])
@token_required
def layers_improve_chat(current_user, idea_id):
    """Continue the improvement layers session."""
    from app.services.layers_service import LayersService
    idea = Idea.find_by_id(idea_id)
    if not idea or idea.user_id != current_user.id:
        return ResponseFormatter.error("Idea not found", status=404)

    data = request.get_json(silent=True) or {}
    history = data.get('history', [])

    analysis = idea.analysis_data or {}
    context = f"""Existing Idea (IMPROVEMENT MODE): {idea.title}
Description: {idea.description}
Problem: {idea.problem}
Solution: {idea.solution}
Target Audience: {idea.audience}
Market: {idea.industry or idea.market}
Score: {analysis.get('overall_score', 'N/A')}/100
Weaknesses to address: {', '.join(analysis.get('risks', [])[:3])}"""

    try:
        result = LayersService.get_next_question(context, history)
        return ResponseFormatter.success(data=result)
    except Exception as e:
        print(f"Layers improve chat error: {str(e)}")
        return ResponseFormatter.error("Analysis is taking longer than usual. Please try again.", status=500)


@idea_bp.route('/<int:idea_id>/layers/improve/finalize', methods=['POST'])
@token_required
def layers_improve_finalize(current_user, idea_id):
    """Finalize improvements — update the idea fields with refined data and increment ai_layers_count."""
    from app.services.layers_service import LayersService
    idea = Idea.find_by_id(idea_id)
    if not idea or idea.user_id != current_user.id:
        return ResponseFormatter.error("Idea not found", status=404)

    data = request.get_json(silent=True) or {}
    history = data.get('history', [])

    if not history:
        return ResponseFormatter.error("Missing conversation history")

    try:
        context = f"""{idea.title}: {idea.description}
Problem: {idea.problem}
Solution: {idea.solution}
Target Audience: {idea.audience}
Market: {idea.industry or idea.market}"""

        synthesized = LayersService.synthesize_idea(context, history)

        if synthesized.get('description'):
            idea.description = synthesized['description']
        if synthesized.get('problem'):
            idea.problem = synthesized['problem']
        if synthesized.get('solution'):
            idea.solution = synthesized['solution']
        if synthesized.get('audience'):
            idea.audience = synthesized['audience']
        if synthesized.get('market'):
            idea.market = synthesized['market']

        idea.ai_layers_count = (idea.ai_layers_count or 0) + 1
        idea.save()

        return ResponseFormatter.success(
            data={'idea': idea.to_dict(), 'improvements': synthesized},
            message="Idea improved successfully! AI-Refined badge earned."
        )
    except Exception as e:
        print(f"Layers improve finalize error: {str(e)}")
        return ResponseFormatter.error(f"Failed to finalize improvements: {str(e)}", status=500)


# ============================================
# Competitor Watch Endpoints
# ============================================

@idea_bp.route('/<int:idea_id>/competitor-watch', methods=['GET'])
@token_required
def get_competitor_watch(current_user, idea_id):
    """Get competitor watch configuration for an idea"""
    idea = Idea.find_by_id(idea_id)
    if not idea or idea.user_id != current_user.id:
        return ResponseFormatter.error("Idea not found", status=404)
    
    watch = CompetitorWatch.find_by_idea(idea_id)
    
    if not watch:
        return ResponseFormatter.success(
            data={'watch': None, 'has_watch': False},
            message="No competitor watch configured"
        )
    
    return ResponseFormatter.success(
        data={'watch': watch.to_dict(), 'has_watch': True},
        message="Competitor watch retrieved"
    )


@idea_bp.route('/<int:idea_id>/competitor-watch', methods=['POST'])
@token_required
def create_or_update_competitor_watch(current_user, idea_id):
    """Create or update competitor watch for an idea"""
    idea = Idea.find_by_id(idea_id)
    if not idea or idea.user_id != current_user.id:
        return ResponseFormatter.error("Idea not found", status=404)
    
    data = request.get_json(silent=True) or {}
    
    try:
        watch = CompetitorWatch.find_by_idea(idea_id)
        
        if watch:
            if 'is_active' in data:
                watch.is_active = data['is_active']
            if 'scan_frequency' in data:
                watch.scan_frequency = data['scan_frequency']
            if 'keywords' in data:
                watch.keywords = data['keywords']
            watch.save()
        else:
            result = CompetitorMonitoringService.create_watch_for_idea(idea_id)
            if 'error' in result:
                print(f"Watch creation error for idea {idea_id}: {result['error']}")
                return ResponseFormatter.error(result['error'])
            watch = result['watch']
        
        return ResponseFormatter.success(
            data={'watch': watch.to_dict()},
            message="Competitor watch configured successfully"
        )
    except Exception as e:
        print(f"Watch configuration exception: {str(e)}")
        import traceback
        traceback.print_exc()
        return ResponseFormatter.error(f"Internal error: {str(e)}", status=500)


@idea_bp.route('/<int:idea_id>/competitor-watch', methods=['DELETE'])
@token_required
def delete_competitor_watch(current_user, idea_id):
    """Delete competitor watch for an idea"""
    idea = Idea.find_by_id(idea_id)
    if not idea or idea.user_id != current_user.id:
        return ResponseFormatter.error("Idea not found", status=404)
    
    watch = CompetitorWatch.find_by_idea(idea_id)
    if not watch:
        return ResponseFormatter.error("No watch found", status=404)
    
    CompetitorAlert.delete_by_watch(watch.id)
    watch.delete()
    
    return ResponseFormatter.success(message="Competitor watch deleted")


@idea_bp.route('/<int:idea_id>/alerts', methods=['GET'])
@token_required
def get_competitor_alerts(current_user, idea_id):
    """Get competitor alerts for an idea"""
    idea = Idea.find_by_id(idea_id)
    if not idea or idea.user_id != current_user.id:
        return ResponseFormatter.error("Idea not found", status=404)
    
    watch = CompetitorWatch.find_by_idea(idea_id)
    if not watch:
        return ResponseFormatter.success(
            data={'alerts': [], 'total': 0},
            message="No watch configured"
        )
    
    unread_only = request.args.get('unread_only', 'false').lower() == 'true'
    limit = int(request.args.get('limit', 50))
    
    alerts = CompetitorAlert.find_by_watch(watch.id, unread_only=unread_only, limit=limit)
    
    return ResponseFormatter.success(
        data={
            'alerts': [alert.to_dict() for alert in alerts],
            'total': len(alerts),
            'unread_count': sum(1 for a in alerts if not a.is_read)
        },
        message="Alerts retrieved"
    )


@idea_bp.route('/alerts/<int:alert_id>/read', methods=['PATCH'])
@token_required
def mark_alert_read(current_user, alert_id):
    """Mark an alert as read"""
    alert = CompetitorAlert.find_by_id(alert_id)
    if not alert:
        return ResponseFormatter.error("Alert not found", status=404)
    
    # Verify ownership through watch -> idea -> user
    watch = CompetitorWatch.find_by_id(alert.watch_id)
    if not watch:
        return ResponseFormatter.error("Watch not found", status=404)
    
    idea = Idea.find_by_id(watch.idea_id)
    if not idea or idea.user_id != current_user.id:
        return ResponseFormatter.error("Unauthorized", status=403)
    
    alert.is_read = True
    alert.save()
    
    return ResponseFormatter.success(
        data={'alert': alert.to_dict()},
        message="Alert marked as read"
    )


@idea_bp.route('/<int:idea_id>/competitor-watch/scan', methods=['POST'])
@token_required
def trigger_competitor_scan(current_user, idea_id):
    """Manually trigger a competitor scan"""
    idea = Idea.find_by_id(idea_id)
    if not idea or idea.user_id != current_user.id:
        return ResponseFormatter.error("Idea not found", status=404)
    
    watch = CompetitorWatch.find_by_idea(idea_id)
    if not watch:
        return ResponseFormatter.error("No watch configured", status=404)
    
    result = CompetitorMonitoringService.scan_competitors(watch.id)
    
    if 'error' in result:
        return ResponseFormatter.error(result['error'])
    
    return ResponseFormatter.success(
        data=result,
        message=f"Scan completed. Found {result.get('new_alerts', 0)} new alerts."
    )


@idea_bp.route('/shared/<string:share_token>', methods=['GET'])
def get_public_idea(share_token):
    """Public, no-auth endpoint to view a shared idea by its share token."""
    idea = Idea.find_by_share_token(share_token)

    if not idea:
        return ResponseFormatter.error(
            "This link is invalid or has expired.", status=404
        )

    if not idea.is_public:
        return ResponseFormatter.error(
            "This idea is no longer public. The owner has made it private.", status=403
        )

    # Increment public view counter
    idea.public_views = (idea.public_views or 0) + 1
    idea.save()

    return ResponseFormatter.success(
        data={'idea': idea.to_public_dict()},
        message="Idea fetched successfully"
    )


# ============================================
# Shared Idea Interaction Endpoints
# ============================================

@idea_bp.route('/shared/<string:share_token>/comments', methods=['GET'])
def get_shared_comments(share_token):
    """Fetch comments for a shared idea via its share token."""
    idea = Idea.find_by_share_token(share_token)
    if not idea:
        return ResponseFormatter.error("Invalid share token", status=404)
        
    comments = Comment.find_by_idea(idea.id)
    return ResponseFormatter.success(
        data={'comments': [c.to_dict() for c in comments]},
        message="Comments fetched successfully"
    )

@idea_bp.route('/shared/<string:share_token>/comments', methods=['POST'])
def post_shared_comment(share_token):
    """Post a comment to a shared idea via its share token."""
    idea = Idea.find_by_share_token(share_token)
    if not idea:
        return ResponseFormatter.error("Invalid share token", status=404)
        
    data = request.get_json(silent=True) or {}
    content = data.get('content', '').strip()
    author_name = data.get('author_name', 'Anonymous').strip() or 'Anonymous'
    
    if not content:
        return ResponseFormatter.error("Comment content is required")
        
    comment = Comment(
        content=content,
        author_name=author_name,
        idea_id=idea.id
    )
    comment.save()
    
    return ResponseFormatter.success(
        data={'comment': comment.to_dict()},
        message="Comment posted successfully",
        status=201
    )
