import os
import json
import time
from flask import current_app
from app.services.gemini_service import GeminiService
from app.services.market_service import MarketService
from app.models.user_model import Idea, User, StageResult, Notification


# ─── Stage Definitions ───────────────────────────────────────────────────────

STAGES = [
    {
        "name": "validation",
        "prompt_file": "idea_validation_prompt.txt",
        "number": 1,
        "context_stages": [],
        "research_type": None,
    },
    {
        "name": "market_research",
        "prompt_file": "market_research_prompt.txt",
        "number": 2,
        "context_stages": ["validation"],
        "research_type": "market",
    },
    {
        "name": "target_audience",
        "prompt_file": "target_audience_prompt.txt",
        "number": 3,
        "context_stages": ["validation", "market_research"],
        "research_type": None,
    },
    {
        "name": "competitor_analysis",
        "prompt_file": "competitor_analysis_prompt.txt",
        "number": 4,
        "context_stages": ["validation", "market_research"],
        "research_type": "competitor",
    },
    {
        "name": "monetization",
        "prompt_file": "monetization_prompt.txt",
        "number": 5,
        "context_stages": ["validation", "market_research", "target_audience", "competitor_analysis"],
        "research_type": None,
    },
    {
        "name": "mvp_planning",
        "prompt_file": "mvp_planning_prompt.txt",
        "number": 6,
        "context_stages": ["validation", "monetization", "target_audience"],
        "research_type": None,
    },
    {
        "name": "gtm_strategy",
        "prompt_file": "gtm_strategy_prompt.txt",
        "number": 7,
        "context_stages": ["validation", "target_audience", "monetization", "competitor_analysis"],
        "research_type": None,
    },
    {
        "name": "final_report",
        "prompt_file": "final_report_prompt.txt",
        "number": 8,
        "context_stages": "ALL",
        "research_type": None,
    },
]


class IdeaAnalysisService:
    """Handles the 8-stage AI analysis pipeline with context chaining."""

    @staticmethod
    def process_idea_analysis(idea_id):
        idea = Idea.find_by_id(idea_id)
        if not idea:
            return None

        try:
            idea.status = 'processing'
            idea.save()

            user_idea = idea.get_idea_context()
            results = {}
            all_analysis = {}

            for stage_def in STAGES:
                stage_name = stage_def["name"]
                print(f"[Analysis] Stage {stage_def['number']}/8: {stage_name} for idea #{idea_id}")

                # Track current stage for frontend polling
                idea.current_stage = stage_def["number"]
                idea.current_stage_name = stage_name
                idea.save()

                if stage_def["context_stages"] == "ALL":
                    previous = results.copy()
                elif stage_def["context_stages"]:
                    previous = {s: results[s] for s in stage_def["context_stages"] if s in results}
                else:
                    previous = {}

                research_data = None
                if stage_def["research_type"] == "market":
                    research_data = IdeaAnalysisService._get_market_research(user_idea)
                elif stage_def["research_type"] == "competitor":
                    research_data = IdeaAnalysisService._get_competitor_research(user_idea)

                prompt = IdeaAnalysisService._build_stage_prompt(
                    stage_def["prompt_file"],
                    user_idea,
                    previous,
                    research_data
                )

                result = GeminiService.call_gemini(prompt, stage_name)

                if result["success"] and result["data"]:
                    stage_data = result["data"]
                else:
                    print(f"[Analysis] Stage {stage_name} failed: {result.get('error', 'Unknown')}")
                    stage_data = {
                        "score": 50,
                        "error": f"Analysis failed for this stage: {result.get('error', 'Unknown')}",
                        "key_insight": "This stage encountered an error. Please retry the analysis."
                    }

                results[stage_name] = stage_data
                IdeaAnalysisService._save_stage_result(idea_id, stage_def["number"], stage_name, stage_data)
                all_analysis[stage_name] = stage_data

                if stage_def["number"] < 8:
                    time.sleep(15)

            compiled = IdeaAnalysisService._compile_analysis_data(results, user_idea)
            idea.analysis_data = compiled
            idea.status = 'completed'

            final = results.get("final_report", {})
            idea.overall_score = final.get("overall_score", compiled.get("overall_score", 50))
            idea.risk_level = final.get("risk_level", "Medium")

            user = User.find_by_id(idea.user_id)
            if user:
                user.api_credits_used += 1
                user.save()

            try:
                notif = Notification(
                    user_id=idea.user_id,
                    title="Analysis Complete!",
                    message=f'Your idea "{idea.title}" scored {idea.overall_score}/100. View full results now.',
                    type="success",
                    link=f"/dashboard/idea/{idea.id}/validation",
                )
                notif.save()
            except Exception as ne:
                print(f"[Notification] Failed to create: {ne}")

            idea.save()
            print(f"[Analysis] Complete for idea #{idea_id}. Score: {idea.overall_score}")
            return compiled

        except Exception as e:
            print(f"[Analysis] Fatal error for idea #{idea_id}: {str(e)}")
            import traceback
            traceback.print_exc()

            idea.status = 'failed'
            idea.analysis_data = IdeaAnalysisService._build_fallback_data(str(e))
            idea.save()

            return idea.analysis_data

    # ─── Prompt Building ──────────────────────────────────────────────────────

    @staticmethod
    def _build_stage_prompt(prompt_file, user_idea, previous_results=None, research_data=None):
        from app.services.prompts import PROMPTS

        template = PROMPTS.get(prompt_file)
        if not template:
            raise ValueError(f"Unknown prompt template: {prompt_file}")

        previous_context = ""
        if previous_results:
            previous_context = (
                "=== PREVIOUS STAGE RESULTS (USE THESE FOR CONSISTENCY) ===\n"
                + json.dumps(previous_results, indent=2, default=str)
                + "\n=== END PREVIOUS RESULTS ===\n"
            )

        research_str = ""
        if research_data:
            research_str = (
                "=== REAL-TIME RESEARCH DATA (USE THIS — IT'S FROM LIVE SEARCH) ===\n"
                + json.dumps(research_data, indent=2, default=str)
                + "\n=== END RESEARCH DATA ===\n"
            )

        prompt = template.format(
            title=user_idea.get("title", ""),
            description=user_idea.get("description", ""),
            industry=user_idea.get("industry", ""),
            target_market=user_idea.get("target_market", ""),
            target_audience=user_idea.get("target_audience", ""),
            problem=user_idea.get("problem", ""),
            solution=user_idea.get("solution", ""),
            stage=user_idea.get("stage", "idea"),
            previous_context=previous_context,
            research_data=research_str,
        )

        return prompt

    # ─── Research Grounding ───────────────────────────────────────────────────

    @staticmethod
    def _get_market_research(user_idea):
        try:
            industry = (user_idea.get("industry", "") or "")[:80]
            title = (user_idea.get("title", "") or "")[:60]

            queries = [
                f"{title} software market size 2025",
                f"AI {industry} market size CAGR 2024 2025",
                f"{title} {industry} market growth trends 2025",
            ]

            results = []
            for query in queries:
                search_result = MarketService.search(query, max_results=3)
                answer = search_result.get("answer", "")
                for r in search_result.get("results", []):
                    results.append({
                        "query": query,
                        "title": r.get("title", ""),
                        "snippet": r.get("snippet", ""),
                        "source": r.get("source", ""),
                        "ai_summary": answer,
                    })

            return results if results else None

        except Exception as e:
            print(f"[Research] Market research error: {e}")
            return None

    @staticmethod
    def _get_competitor_research(user_idea):
        try:
            industry = (user_idea.get("industry", "") or "")[:80]
            title = (user_idea.get("title", "") or "")[:60]

            queries = [
                f"{title} competitors 2025",
                f"best {title} alternatives software tools",
                f"AI {industry} software competitors startups 2025",
                f"{title} alternative tools",
            ]

            results = []
            competitor_urls = []

            for query in queries:
                search_result = MarketService.search(query, max_results=3)
                for r in search_result.get("results", []):
                    results.append({
                        "query": query,
                        "title": r.get("title", ""),
                        "snippet": r.get("snippet", ""),
                        "source": r.get("source", ""),
                    })
                    url = r.get("link", "")
                    if url and len(competitor_urls) < 2:
                        competitor_urls.append(url)

            scraped_content = []
            for url in competitor_urls[:2]:
                content = MarketService.scrape_url(url)
                if content:
                    scraped_content.append({
                        "url": url,
                        "content": content[:2000],
                    })

            if scraped_content:
                results.append({
                    "query": "DEEP_SCRAPE",
                    "title": "Firecrawl Deep Competitor Intelligence",
                    "snippet": f"Scraped {len(scraped_content)} competitor websites for detailed analysis.",
                    "scraped_sites": scraped_content,
                })

            return results if results else None

        except Exception as e:
            print(f"[Research] Competitor research error: {e}")
            return None

    # ─── Stage Result Persistence ─────────────────────────────────────────────

    @staticmethod
    def _save_stage_result(idea_id, stage_number, stage_name, data):
        try:
            existing = StageResult.find_by_idea_and_stage(idea_id, stage_name)

            if existing:
                existing.result_json = data
                existing.score = data.get("score")
                existing.version = (existing.version or 1) + 1
                existing.save()
            else:
                stage_result = StageResult(
                    idea_id=idea_id,
                    stage_number=stage_number,
                    stage_name=stage_name,
                    result_json=data,
                    score=data.get("score"),
                    version=1,
                )
                stage_result.save()
        except Exception as e:
            print(f"[Analysis] Failed to save stage result {stage_name}: {e}")

    # ─── Data Compilation ─────────────────────────────────────────────────────

    @staticmethod
    def _compile_analysis_data(results, user_idea):
        validation = results.get("validation", {})
        market = results.get("market_research", {})
        audience = results.get("target_audience", {})
        competitors = results.get("competitor_analysis", {})
        monetization = results.get("monetization", {})
        mvp = results.get("mvp_planning", {})
        gtm = results.get("gtm_strategy", {})
        final = results.get("final_report", {})

        stage_scores = []
        for stage_data in results.values():
            if isinstance(stage_data, dict) and "score" in stage_data:
                try:
                    stage_scores.append(int(stage_data["score"]))
                except (ValueError, TypeError):
                    pass

        overall_score = final.get("overall_score")
        if not overall_score and stage_scores:
            overall_score = round(sum(stage_scores) / len(stage_scores))

        compiled = {
            "overall_score": overall_score or 50,
            "scores": validation.get("scores", {
                "market_demand": {"label": "N/A", "value": 50},
                "problem_severity": {"label": "N/A", "value": 50},
                "growth_potential": {"label": "N/A", "value": 50},
            }),
            "strengths": final.get("top_strengths", validation.get("strengths", [])),
            "risks": final.get("top_risks", validation.get("risks", [])),
            "recommendation": final.get("executive_summary", validation.get("recommendation", "")),
            "market_research": {
                "tam": market.get("tam", "N/A"),
                "sam": market.get("sam", "N/A"),
                "som": market.get("som", "N/A"),
                "cagr": market.get("cagr", "N/A"),
                "trends": market.get("trends", []),
                "segments": market.get("segments", []),
                "score": market.get("score"),
            },
            "competitors": competitors.get("top_competitors", []),
            "market_gaps": competitors.get("market_gaps", []),
            "competitive_advantage": competitors.get("competitive_advantage", ""),
            "target_audience": {
                "primary_persona": audience.get("primary_persona", {}),
                "secondary_personas": audience.get("secondary_personas", []),
                "audience_size": audience.get("audience_size_estimate", ""),
                "score": audience.get("score"),
            },
            "monetization": {
                "pricing_model": monetization.get("pricing_model", "N/A"),
                "recommended_strategy": monetization.get("recommended_strategy", ""),
                "revenue_model": monetization.get("revenue_model", ""),
                "plans": monetization.get("plans", []),
                "conversion_logic": monetization.get("conversion_logic", ""),
                "unit_economics": monetization.get("unit_economics", {}),
                "score": monetization.get("score"),
            },
            "mvp_blueprint": mvp.get("phases", []),
            "mvp_tech_stack": mvp.get("tech_stack", {}),
            "mvp_timeline": mvp.get("estimated_timeline", ""),
            "mvp_cost": mvp.get("estimated_cost", ""),
            "gtm_strategy": {
                "launch_plan": gtm.get("launch_plan", ""),
                "acquisition_channels": gtm.get("acquisition_channels", []),
                "messaging": gtm.get("messaging", {}),
                "funnel_stages": gtm.get("funnel_stages", {}),
                "early_traction": gtm.get("early_traction", ""),
                "score": gtm.get("score"),
            },
            "final_report": {
                "overall_score": final.get("overall_score", overall_score),
                "verdict": final.get("verdict", ""),
                "risk_level": final.get("risk_level", "Medium"),
                "one_liner": final.get("one_liner", ""),
                "executive_summary": final.get("executive_summary", ""),
                "top_recommendations": final.get("top_recommendations", []),
                "ninety_day_plan": final.get("ninety_day_plan", {}),
                "key_metrics": final.get("key_metrics_to_track", []),
            },
            "stage_results": {
                name: {"score": data.get("score"), "has_data": True}
                for name, data in results.items()
                if isinstance(data, dict)
            },
        }

        return compiled

    @staticmethod
    def _build_fallback_data(error_msg):
        return {
            "overall_score": 0,
            "scores": {
                "market_demand": {"label": "N/A (Error)", "value": 0},
                "problem_severity": {"label": "N/A (Error)", "value": 0},
                "growth_potential": {"label": "N/A (Error)", "value": 0},
            },
            "strengths": ["Your idea was saved successfully"],
            "risks": [f"AI analysis failed: {error_msg}"],
            "recommendation": "The AI analysis encountered an error. Please retry in a few minutes.",
            "market_research": {"tam": "N/A", "sam": "N/A", "som": "N/A", "trends": [], "segments": []},
            "competitors": [],
            "monetization": {"pricing_model": "N/A", "plans": [], "conversion_logic": "N/A"},
            "mvp_blueprint": [],
            "gtm_strategy": {"acquisition_channels": [], "messaging": {}, "funnel_stages": {}},
            "final_report": {"overall_score": 0, "verdict": "Error", "risk_level": "Unknown"},
        }

    # ─── Idea CRUD ────────────────────────────────────────────────────────────

    @staticmethod
    def create_idea(user_id, data):
        idea = Idea(
            user_id=user_id,
            title=data.get('title', ''),
            description=data.get('description', ''),
            problem=data.get('problem', ''),
            solution=data.get('solution', ''),
            audience=data.get('audience', ''),
            market=data.get('market', ''),
            industry=data.get('industry', data.get('market', '')),
            target_market=data.get('target_market', ''),
            target_audience=data.get('target_audience', data.get('audience', '')),
            stage=data.get('stage', 'idea'),
        )
        idea.save()
        return idea

    @staticmethod
    def delete_idea(idea_id, user_id):
        idea = Idea.find_by_id(idea_id)
        if not idea or idea.user_id != user_id:
            return False

        # Clean up related data
        from app import get_db
        db = get_db()
        db.stage_results.delete_many({"idea_id": idea_id})
        db.ai_layers_sessions.delete_many({"idea_id": idea_id})
        db.checklist_items.delete_many({"idea_id": idea_id})
        db.research_notes.delete_many({"idea_id": idea_id})
        db.comments.delete_many({"idea_id": idea_id})
        db.reports.delete_many({"idea_id": idea_id})

        # Delete competitor watch and alerts
        watch = db.competitor_watch.find_one({"idea_id": idea_id})
        if watch:
            db.competitor_alerts.delete_many({"watch_id": watch.get("id")})
            db.competitor_watch.delete_one({"idea_id": idea_id})

        idea.delete()
        return True

    # ─── Investor Pitches ─────────────────────────────────────────────────────

    @staticmethod
    def generate_investor_pitches(idea_id):
        idea = Idea.find_by_id(idea_id)
        if not idea:
            return {"error": "Idea not found"}

        if idea.analysis_data and "investor_pitches" in idea.analysis_data:
            return idea.analysis_data["investor_pitches"]

        analysis = idea.analysis_data or {}
        market = analysis.get("market_research", {})
        competitors = analysis.get("competitors", [])
        audience = analysis.get("target_audience", {})
        final = analysis.get("final_report", {})

        competitor_name = competitors[0].get("name", "incumbents") if competitors else "incumbents"

        prompt = f"""Generate exactly 3 investor pitch formulas for this startup idea.

IDEA: {idea.title} — {idea.description}
PROBLEM: {idea.problem}
SOLUTION: {idea.solution}
TAM: {market.get('tam', 'Unknown')}
CAGR: {market.get('cagr', 'Unknown')}
TOP COMPETITOR: {competitor_name}
TARGET AUDIENCE: {idea.audience or idea.target_audience}
OVERALL SCORE: {analysis.get('overall_score', 'Unknown')}/100
KEY MOAT: {analysis.get('competitive_advantage', 'Unknown')}

Generate pitches in these EXACT 3 formats:

Format A — The Classic:
"[Product] is a [category] for [audience] that [core value prop]. Unlike [competitor], we [key differentiator]."

Format B — The Problem First:
"[X% of audience] struggle with [specific problem]. [Product] solves this by [solution]. We're targeting a $[TAM] market growing at [CAGR]% annually."

Format C — The Traction First:
"[Product] helps [audience] achieve [outcome] in [timeframe]. Our [key moat] gives us a defensible position in the [market size] [industry] market."

ALL numbers (TAM, CAGR, audience size) must come from the analysis data above — NOT made up.

Return JSON:
{{
    "pitches": [
        {{
            "format": "A",
            "style": "The Classic",
            "pitch": "The complete pitch text",
            "hook": "The opening sentence",
            "key_stat": "The most compelling number"
        }},
        {{
            "format": "B",
            "style": "The Problem First",
            "pitch": "...",
            "hook": "...",
            "key_stat": "..."
        }},
        {{
            "format": "C",
            "style": "The Traction First",
            "pitch": "...",
            "hook": "...",
            "key_stat": "..."
        }}
    ]
}}"""

        try:
            result = GeminiService.call_gemini(prompt, "investor_pitches")
            if result["success"]:
                pitches_data = result["data"].get("pitches", [])

                if not idea.analysis_data:
                    idea.analysis_data = {}
                new_data = dict(idea.analysis_data)
                new_data["investor_pitches"] = pitches_data
                idea.analysis_data = new_data
                idea.save()

                return pitches_data
            else:
                return {"error": f"Failed to generate pitches: {result.get('error')}"}

        except Exception as e:
            print(f"Error generating pitches: {str(e)}")
            return {"error": "Failed to generate pitches"}

    # ─── Research Hub ─────────────────────────────────────────────────────────

    @staticmethod
    def generate_research_hub(idea_id):
        idea = Idea.find_by_id(idea_id)
        if not idea:
            return {"error": "Idea not found"}

        if idea.analysis_data and "research_hub" in idea.analysis_data:
            return idea.analysis_data["research_hub"]

        analysis = idea.analysis_data or {}
        industry = idea.industry or idea.market or "Technology"

        prompt = f"""Generate a comprehensive Research & Execution Hub for this startup idea.

Startup Idea: {idea.title}
Description: {idea.description}
Problem: {idea.problem}
Solution: {idea.solution}
Target Audience: {idea.audience}
Market/Industry: {industry}

Analysis Summary:
- Overall Score: {analysis.get('overall_score', 'N/A')}/100
- GTM Strategy: {json.dumps(analysis.get('gtm_strategy', {}), default=str)[:500]}
- MVP Blueprint: {json.dumps(analysis.get('mvp_blueprint', []), default=str)[:500]}
- Market Size: TAM={analysis.get('market_research', {}).get('tam', 'N/A')}

Return this EXACT JSON format:
{{
    "research_links": [
        {{ "title": "Resource name", "url": "Real working URL", "source": "Domain name", "relevance": "Why it matters for this specific idea" }}
    ],
    "execution_checklist": [
        {{ "phase": "Validation", "step": "Action title", "description": "How to do it specifically for {idea.title}" }}
    ],
    "tool_recommendations": [
        {{ "name": "Tool name", "category": "Analytics/Marketing/Development/Design/Finance/Communication", "url": "Real URL", "use_case": "Specific use case for this idea" }}
    ],
    "communities": [
        {{ "name": "Community name", "type": "Forum/Slack/Discord/Subreddit/LinkedIn Group", "url": "Real URL", "members": "Approximate member count", "relevance": "Why join for this idea" }}
    ],
    "investors": [
        {{ "name": "Investor/VC name", "type": "VC/Angel/Accelerator", "focus": "Their investment focus areas", "stage": "Pre-seed/Seed/Series A", "url": "Real URL or portfolio page" }}
    ],
    "templates": [
        {{ "name": "Template name", "type": "Pitch Deck/Financial Model/Business Plan/Legal/Marketing", "url": "Real URL to free template", "description": "What it helps with" }}
    ],
    "milestones": [
        {{
            "phase": "Validation",
            "duration": "Day 1-30",
            "title": "Validate the Problem",
            "goals": ["Goal 1", "Goal 2", "Goal 3", "Goal 4"],
            "kpis": ["KPI 1 with target number", "KPI 2 with target number"],
            "completion_message": "Motivational message when phase is complete"
        }},
        {{
            "phase": "Build",
            "duration": "Day 31-60",
            "title": "Build the MVP",
            "goals": ["Goal 1", "Goal 2", "Goal 3", "Goal 4"],
            "kpis": ["KPI 1 with target number", "KPI 2 with target number"],
            "completion_message": "Motivational message when phase is complete"
        }},
        {{
            "phase": "Growth",
            "duration": "Day 61-90",
            "title": "Launch & Grow",
            "goals": ["Goal 1", "Goal 2", "Goal 3", "Goal 4"],
            "kpis": ["KPI 1 with target number", "KPI 2 with target number"],
            "completion_message": "Motivational message when phase is complete"
        }}
    ]
}}

Rules:
- 6 research_links with REAL, working URLs from authoritative sources
- 4-5 checklist items per phase (Validation, MVP, Growth) = 12-15 total
- 8 tool_recommendations relevant to the {industry} industry
- 5 communities (real forums/groups where {industry} founders hang out)
- 5 investors (real VCs/angels who invest in {industry})
- 5 templates (real free templates from sites like Notion, Canva, Google Docs)
- EXACTLY 3 milestones (Validation 1-30 days, Build 31-60 days, Growth 61-90 days)
- Each milestone must have a unique, encouraging completion_message (2-3 sentences)
- All content must be SPECIFIC to {idea.title} and the {industry} industry
- Do NOT use generic placeholder content"""

        try:
            result = GeminiService.call_gemini(prompt, "research_hub")
            if result["success"]:
                hub_data = result["data"]

                if not idea.analysis_data:
                    idea.analysis_data = {}
                new_data = dict(idea.analysis_data)
                new_data["research_hub"] = hub_data
                idea.analysis_data = new_data
                idea.save()

                return hub_data
            else:
                return {"error": f"Failed to generate research hub: {result.get('error')}"}

        except Exception as e:
            print(f"Error generating research hub for idea {idea_id}: {str(e)}")
            return {"error": f"Failed to generate research hub: {str(e)}"}
