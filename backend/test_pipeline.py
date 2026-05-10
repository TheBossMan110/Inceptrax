"""
Test script: Submit a real idea through the 8-stage pipeline and verify each stage.
"""
import os
import sys
import json

# Add parent to path
sys.path.insert(0, os.path.dirname(__file__))

from app import create_app, db
from app.services.idea_analysis_service import IdeaAnalysisService
from app.models.user_model import Idea, User, StageResult

app = create_app()

TEST_IDEA = {
    "title": "FreshBite - AI Meal Planning for Busy Parents",
    "description": "An app that uses AI to generate weekly meal plans based on family dietary restrictions, budget, and available cooking time. Connects to grocery delivery APIs for one-tap ingredient ordering.",
    "problem": "Working parents spend 3+ hours per week planning meals and grocery shopping, often defaulting to unhealthy fast food due to time pressure.",
    "solution": "AI generates personalized 7-day meal plans in 30 seconds, factoring in allergies, budget, prep time, and kid-friendly preferences. One-click grocery ordering via Instacart/Walmart integration.",
    "audience": "Working parents with kids aged 2-12 in US suburbs",
    "market": "Food tech / meal planning",
    "industry": "Food Technology",
    "target_market": "US suburban families, dual-income households",
    "target_audience": "Working parents aged 28-42 with children",
    "stage": "idea"
}

def run_test():
    with app.app_context():
        # Create a test user if needed
        user = User.query.filter_by(email="test@pipeline.com").first()
        if not user:
            user = User(first_name="Test", last_name="Pipeline", email="test@pipeline.com")
            user.set_password("TestPass123")
            db.session.add(user)
            db.session.commit()
            print(f"[Test] Created test user #{user.id}")

        # Create the idea
        idea = IdeaAnalysisService.create_idea(user.id, TEST_IDEA)
        print(f"[Test] Created idea #{idea.id}: {idea.title}")
        print(f"[Test] Industry: {idea.industry}")
        print(f"[Test] Target audience: {idea.target_audience}")
        print()

        # Run the full pipeline
        print("=" * 60)
        print("RUNNING 8-STAGE PIPELINE...")
        print("=" * 60)

        result = IdeaAnalysisService.process_idea_analysis(idea.id)

        if not result:
            print("[FAIL] Pipeline returned None!")
            return

        # Verify each stage
        stage_results = StageResult.query.filter_by(idea_id=idea.id).order_by(StageResult.stage_number).all()

        print(f"\n[Result] Pipeline completed. {len(stage_results)} stages saved.")
        print(f"[Result] Overall score: {idea.overall_score}")
        print(f"[Result] Risk level: {idea.risk_level}")
        print(f"[Result] Status: {idea.status}")
        print()

        for sr in stage_results:
            data = sr.result_json or {}
            score = data.get("score", "N/A")
            print(f"--- Stage {sr.stage_number}: {sr.stage_name} (score: {score}) ---")

            # Check for generic/error content
            if data.get("error"):
                print(f"  [WARN] Error in stage: {data['error']}")

            # Print key insight
            insight = data.get("key_insight", "")
            if insight:
                print(f"  Key insight: {insight[:150]}...")

            # Stage-specific checks
            if sr.stage_name == "validation":
                strengths = data.get("strengths", [])
                print(f"  Strengths: {strengths[:2]}")
                # Check if "FreshBite" or "meal" or "parent" appears
                text = json.dumps(data).lower()
                has_specific = any(w in text for w in ["meal", "parent", "food", "freshbite", "grocery", "cooking"])
                print(f"  [CHECK] Idea-specific content: {'PASS' if has_specific else 'FAIL - GENERIC OUTPUT'}")

            elif sr.stage_name == "market_research":
                tam = data.get("tam", "N/A")
                trends = data.get("trends", [])
                print(f"  TAM: {tam}")
                print(f"  Trends count: {len(trends)}")
                text = json.dumps(data).lower()
                has_specific = any(w in text for w in ["meal", "food", "grocery", "kitchen", "recipe"])
                print(f"  [CHECK] Industry-specific market data: {'PASS' if has_specific else 'FAIL - GENERIC OUTPUT'}")

            elif sr.stage_name == "competitor_analysis":
                competitors = data.get("top_competitors", [])
                print(f"  Competitors found: {len(competitors)}")
                for comp in competitors[:5]:
                    if isinstance(comp, dict):
                        name = comp.get("name", "Unknown")
                        threat = comp.get("threat", "?")
                        print(f"    - {name} (threat: {threat})")
                    else:
                        print(f"    - {comp}")

                # CRITICAL CHECK: Are these real food tech companies, not Zapier/Make?
                comp_names = [c.get("name", "").lower() if isinstance(c, dict) else str(c).lower() for c in competitors]
                all_names = " ".join(comp_names)
                generic_names = ["zapier", "make.com", "notion", "trello", "slack"]
                has_generic = any(g in all_names for g in generic_names)
                food_names = ["mealime", "yummly", "hellofresh", "blue apron", "whisk", "eat this much", "plan to eat", "paprika", "cooklist", "instacart", "doordash"]
                has_food = any(f in all_names for f in food_names)
                print(f"  [CHECK] Real food-tech competitors: {'PASS' if has_food else 'UNCERTAIN (check names above)'}")
                print(f"  [CHECK] No generic/wrong-industry names: {'PASS' if not has_generic else 'FAIL - FOUND GENERIC NAMES'}")

            elif sr.stage_name == "monetization":
                model = data.get("pricing_model", "N/A")
                plans = data.get("plans", [])
                print(f"  Pricing model: {model}")
                print(f"  Plans count: {len(plans)}")

            elif sr.stage_name == "final_report":
                verdict = data.get("verdict", "N/A")
                overall = data.get("overall_score", "N/A")
                print(f"  Verdict: {verdict}")
                print(f"  Overall score: {overall}")
                recs = data.get("top_recommendations", [])
                print(f"  Recommendations: {len(recs)}")

            print()

        # Check compiled analysis_data
        ad = idea.analysis_data or {}
        print("=" * 60)
        print("COMPILED ANALYSIS_DATA CHECK")
        print("=" * 60)
        print(f"  overall_score: {ad.get('overall_score')}")
        print(f"  strengths count: {len(ad.get('strengths', []))}")
        print(f"  risks count: {len(ad.get('risks', []))}")
        print(f"  competitors count: {len(ad.get('competitors', []))}")
        print(f"  market_research.tam: {ad.get('market_research', {}).get('tam')}")
        print(f"  monetization.pricing_model: {ad.get('monetization', {}).get('pricing_model')}")
        print(f"  mvp_blueprint phases: {len(ad.get('mvp_blueprint', []))}")
        print(f"  gtm channels: {len(ad.get('gtm_strategy', {}).get('acquisition_channels', []))}")
        print(f"  final_report.verdict: {ad.get('final_report', {}).get('verdict')}")
        print(f"  stage_results keys: {list(ad.get('stage_results', {}).keys())}")

        # Cleanup
        print("\n[Test] Complete! Cleaning up test data...")
        # Don't delete — keep for inspection
        print(f"[Test] Test idea #{idea.id} preserved for manual inspection")


if __name__ == "__main__":
    run_test()
