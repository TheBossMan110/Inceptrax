import json
from app.services.gemini_service import GeminiService

# The 5 idea "Layers" the engine explores, in priority order
LAYERS = [
    { "id": "problem",    "label": "The Problem",    "focus": "What specific problem are you solving? Who feels this pain most acutely?" },
    { "id": "solution",   "label": "The Solution",   "focus": "How does your idea solve this problem? What makes your approach unique?" },
    { "id": "audience",   "label": "The Audience",   "focus": "Who is your ideal first customer? What does their daily life look like?" },
    { "id": "market",     "label": "The Market",     "focus": "What industry or vertical does this live in? How big is the opportunity?" },
    { "id": "monetize",   "label": "Monetization",   "focus": "How will you make money from this? Who pays and how much?" },
]

ORCHESTRATOR_PROMPT = """You are a sharp, insightful startup advisor running an "Idea Layers Engine" session.

Your job: Based on the current idea description and the conversation so far, identify the SINGLE most important piece of missing information and ask ONE focused follow-up question.

Rules:
- Ask only ONE question — short, direct, human
- Target the biggest knowledge gap
- Rotate through: problem, solution, audience, market, monetization
- If the idea already has a layer covered, skip it
- Never repeat a question already asked
- Be encouraging but rigorous

Respond ONLY in this JSON format (no markdown):
{{
  "layer": "problem|solution|audience|market|monetize",
  "layer_label": "Human readable layer name",
  "question": "Your single follow-up question here",
  "progress_pct": 0-100,
  "is_ready": false
}}

Set is_ready=true if you have sufficiently covered the idea or if the conversation has become exhaustive."""


SYNTHESIS_PROMPT = """You are a startup analyst synthesizing a conversation into a structured idea profile.

# Conversation History
{history}

# Original Idea
{initial_idea}

Your job: Extract and structure all the information gathered into a clean startup profile.

Respond ONLY in this JSON format (no markdown):
{{
  "title": "Concise startup name/title (max 10 words)",
  "description": "Full description of the idea incorporating all insights gathered (3-5 sentences)",
  "problem": "The core problem being solved (2-3 sentences)",
  "solution": "The proposed solution and unique approach (2-3 sentences)",
  "audience": "The target audience and their characteristics (2-3 sentences)",
  "market": "The target market/industry and opportunity size"
}}"""


class LayersService:

    @staticmethod
    def get_first_question(initial_idea: str) -> dict:
        """Get the very first layer question based on the seed idea."""
        prompt = f"""{ORCHESTRATOR_PROMPT}

# User's Initial Idea
{initial_idea}

# Conversation So Far
(none — this is the very first question)

Ask the most important first question to deepen understanding of this idea."""

        raw = GeminiService.generate_analysis(prompt)
        cleaned = raw.replace('```json', '').replace('```', '').strip()
        return json.loads(cleaned)

    @staticmethod
    def get_next_question(initial_idea: str, history: list) -> dict:
        """Given conversation history, return the next most important question OR signal readiness."""
        history_text = "\n".join([
            f"{'AI' if i % 2 == 0 else 'User'}: {msg}"
            for i, msg in enumerate(history)
        ])

        # Enforce hard limit: If 4 answers have been given (history len=8), the NEXT call should be ready.
        # History: [Q1, A1, Q2, A2, Q3, A3, Q4, A4] -> length 8. 
        if len(history) >= 8:
            return {
                "layer": "done",
                "layer_label": "Complete",
                "question": "Great! I have all the core details I need to build your analysis. Ready to see the results?",
                "progress_pct": 100,
                "is_ready": True
            }

        prompt = f"""{ORCHESTRATOR_PROMPT}

# User's Initial Idea
{initial_idea}

# Conversation So Far
{history_text}

Based on what we know, what is the most critical follow-up question?"""

        raw = GeminiService.generate_analysis(prompt)
        cleaned = raw.replace('```json', '').replace('```', '').strip()
        result = json.loads(cleaned)
        
        # Double check limit in result just in case
        if len(history) >= 6: # On the 4th question, Gemini might already be ready
            result["progress_pct"] = max(result.get("progress_pct", 0), 80)

        return result

    @staticmethod
    def synthesize_idea(initial_idea: str, history: list) -> dict:
        """Convert the full Q&A conversation into a structured startup profile."""
        history_text = "\n".join([
            f"{'AI Question' if i % 2 == 0 else 'User Answer'}: {msg}"
            for i, msg in enumerate(history)
        ])

        prompt = SYNTHESIS_PROMPT.format(
            history=history_text,
            initial_idea=initial_idea
        )

        raw = GeminiService.generate_analysis(prompt)
        cleaned = raw.replace('```json', '').replace('```', '').strip()
        return json.loads(cleaned)
