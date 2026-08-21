"""
Model routing by subscription tier (Phase 2 spec §5.1)

One place decides which model serves which task for which tier. Route handlers
must never name a model directly — otherwise "Pro gets premium models" drifts
into a promise the code doesn't keep.

Economics this encodes (Anthropic list pricing, Aug 2026):

    Claude Sonnet 5   $3.00 / $15.00  per 1M in/out
    Claude Haiku 4.5  $1.00 /  $5.00  per 1M in/out

A full 8-stage analysis runs roughly 12K input + 8K output tokens. Entirely on
Sonnet that is about $0.156. At 2,000 credits (~66 analyses) a Pro user could
consume ~$10.30 against PKR 4,500 (~$16) of revenue — before payment fees that
is a ~36% margin, and it collapses further on the heaviest users.

So premium routing is deliberately *partial*: the early research stages stay on
the cheap model and only the stages where reasoning quality actually shows —
monetization, MVP, GTM, and the final synthesis — get Sonnet. That lands near
$0.09 per analysis and keeps the tier comfortably profitable while still being
a real upgrade the user can feel.

If ANTHROPIC_API_KEY is absent, everything transparently routes to Gemini. The
app never breaks for lack of a key; it just stops offering the premium path.
"""

import os
import logging

logger = logging.getLogger(__name__)

# Model identifiers
GEMINI = "gemini"
SONNET = "claude-sonnet-5"
HAIKU = "claude-haiku-4-5"

# ── Gemini model selection ────────────────────────────────────────────────
#
# Google ships new Flash models often — 2.5 was current when this app was
# written and 3.7 exists now. Two ways to keep up:
#
#   PINNED (default)  an exact version. Predictable: quality and JSON shape
#                     never change under you. Costs a quarterly review.
#   FLOATING          the `-latest` aliases Google maintains. Free upgrades,
#                     but a model can change behaviour overnight — which for
#                     a JSON-parsing pipeline means silent breakage.
#
# Pinned is the default because this pipeline parses structured JSON from
# every stage; an unannounced model swap is a production incident, not a perk.
# Set GEMINI_MODEL_STRATEGY=floating to opt into auto-updates.
#
# Override any single choice with GEMINI_MODEL (heavy) / GEMINI_MODEL_LIGHT.

GEMINI_PINNED = {
    "heavy": "gemini-3.7-flash",       # newest Flash — analysis stages
    "light": "gemini-3.5-flash-lite",  # cheap + fast — classification, short text
}
GEMINI_FLOATING = {
    "heavy": "gemini-flash-latest",
    "light": "gemini-flash-lite-latest",
}


def gemini_model(weight: str = "heavy") -> str:
    """Resolve the Gemini model id for heavy or light work."""
    explicit = os.getenv("GEMINI_MODEL" if weight == "heavy" else "GEMINI_MODEL_LIGHT", "").strip()
    if explicit:
        return explicit
    floating = os.getenv("GEMINI_MODEL_STRATEGY", "pinned").strip().lower() == "floating"
    table = GEMINI_FLOATING if floating else GEMINI_PINNED
    return table.get(weight, table["heavy"])

# Stages where premium reasoning changes the output enough to pay for it.
# Stages 1-4 are research-and-summarise; the model matters far less there.
PREMIUM_STAGES = {
    "monetization",
    "mvp_planning",
    "gtm_strategy",
    "final_report",
}

# Tasks a paying user gets a premium model for, outside the analysis pipeline.
PREMIUM_TASKS = {
    "investor_pitches",
    "stress_test",
    "pivot_suggester",
    "rag_ask",
}

# Cheap, short, high-volume work — Haiku is the right tool even for Pro.
LIGHT_TASKS = {
    "one_liner",
    "progress_coach",
    "idea_watcher_queries",
    "idea_watcher_scoring",
    "competitor_discovery",
    "layers_chat",
}


def anthropic_available() -> bool:
    """True when a Claude key is configured. Everything degrades without it."""
    return bool(os.getenv("ANTHROPIC_API_KEY", "").strip())


def select_model(task_type: str, tier: str = "free") -> str:
    """
    The model to use for one task at one tier.

    Returns GEMINI, SONNET, or HAIKU. Callers pass the result to
    `call_model()` rather than branching on it themselves.
    """
    from app_fastapi.services.credit_service import TIER_CONFIG, resolve_tier

    tier = resolve_tier(tier)
    config = TIER_CONFIG.get(tier, TIER_CONFIG["free"])

    # The tier flag is the gate. Free and Starter never reach a premium model,
    # regardless of task — this is what makes "premium models" a real feature
    # difference rather than a line on a pricing page.
    if not config.get("premium_models") or not anthropic_available():
        return GEMINI

    if task_type in LIGHT_TASKS:
        return HAIKU
    if task_type in PREMIUM_STAGES or task_type in PREMIUM_TASKS:
        return SONNET
    return GEMINI


def call_model(prompt: str, task_type: str, tier: str = "free",
               system_instruction: str = None) -> dict:
    """
    Run a prompt on the tier-appropriate model.

    Returns the same shape as GeminiService.call_gemini
    ({"success", "data", "error", "stage"}) so this can be dropped into
    existing call sites without changing how results are handled.
    """
    model = select_model(task_type, tier)

    if model == GEMINI:
        from app.services.gemini_service import GeminiService
        return GeminiService.call_gemini(prompt, task_type, system_instruction)

    result = _call_anthropic(prompt, model, task_type, system_instruction)
    if result.get("success"):
        return result

    # A premium failure must never cost the user their request. Fall back to
    # the standard model rather than surfacing an error.
    logger.warning(
        "[ModelRouter] %s failed for %s (%s) — falling back to Gemini",
        model, task_type, result.get("error"),
    )
    from app.services.gemini_service import GeminiService
    return GeminiService.call_gemini(prompt, task_type, system_instruction)


def _call_anthropic(prompt: str, model: str, task_type: str,
                    system_instruction: str = None) -> dict:
    """Call Claude and parse the JSON body the prompts ask for."""
    try:
        import anthropic
    except ImportError:
        return {"success": False, "data": None,
                "error": "anthropic SDK not installed", "stage": task_type}

    try:
        client = anthropic.Anthropic()

        kwargs = {
            "model": model,
            "max_tokens": 16000,
            "messages": [{"role": "user", "content": prompt}],
        }
        if system_instruction:
            kwargs["system"] = system_instruction

        # Sonnet reasons adaptively; Haiku predates adaptive thinking and is
        # used for short tasks where it would not help anyway.
        if model == SONNET:
            kwargs["thinking"] = {"type": "adaptive"}
            kwargs["output_config"] = {"effort": "medium"}

        response = client.messages.create(**kwargs)

        if response.stop_reason == "refusal":
            detail = getattr(response, "stop_details", None)
            return {"success": False, "data": None,
                    "error": f"refused ({getattr(detail, 'category', 'unknown')})",
                    "stage": task_type}

        text = "".join(b.text for b in response.content if b.type == "text")

        from app.services.gemini_service import GeminiService
        data = GeminiService._parse_json_response(text)

        _log_usage(model, task_type, response)
        return {"success": True, "data": data, "error": None, "stage": task_type}

    except Exception as e:
        return {"success": False, "data": None, "error": str(e)[:300], "stage": task_type}


def _log_usage(model: str, task_type: str, response) -> None:
    """
    Record cost per call (spec §5.3).

    Without this there is no way to answer "what does a Pro user actually cost
    us", which is the number the whole pricing model rests on.
    """
    try:
        from datetime import datetime
        from app import get_db

        usage = getattr(response, "usage", None)
        if not usage:
            return

        rates = {
            SONNET: (3.00, 15.00),
            HAIKU: (1.00, 5.00),
        }
        rate_in, rate_out = rates.get(model, (0.0, 0.0))
        tokens_in = getattr(usage, "input_tokens", 0) or 0
        tokens_out = getattr(usage, "output_tokens", 0) or 0
        cost = (tokens_in * rate_in + tokens_out * rate_out) / 1_000_000

        get_db().ai_call_log.insert_one({
            "provider": "anthropic",
            "model": model,
            "task_type": task_type,
            "input_tokens": tokens_in,
            "output_tokens": tokens_out,
            "cost_usd": round(cost, 6),
            "created_at": datetime.utcnow(),
        })
    except Exception as e:
        logger.debug("[ModelRouter] usage logging skipped: %s", e)
