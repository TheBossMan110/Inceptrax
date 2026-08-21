"""
Credit Service — Core ledger logic for the credit system.

Rules from spec:
- Credits deducted AFTER operation succeeds (never before)
- On subscription renewal: RESET to tier amount, don't accumulate
- Negative balance = blocked from paid operations
- All transactions logged in credit_transactions for audit trail
"""

from datetime import datetime


# ─── Credit Costs ──────────────────────────────────────────────────────────────

CREDIT_COSTS = {
    "analysis":          30,   # Full 8-stage analysis
    "reanalyze":         30,   # Re-run full analysis
    "single_stage":       5,   # Single stage re-run
    "founder_match":      2,   # Founder-Idea Match Score
    "stress_test":        3,   # Stress Test
    "one_liner":          1,   # One-Liner Pitch Generator
    "investor_pitch":     6,   # Investor Pitch
    "research_hub":       8,   # Research Hub
    "ai_layers_session":  5,   # AI Layers full session (~6 turns)
    "voice_extraction":   3,   # Voice/file → idea extraction
    "competitor_scan":    3,   # Competitor scan (manual trigger)
    "pdf_export":         0,   # PDF export (free)
    "ppt_export":         0,   # PPT export (free)
}


# ─── Tier Definitions ──────────────────────────────────────────────────────────
#
# Single source of truth for pricing. The billing page and the pitch deck must
# both read from here (exposed via GET /api/billing/tiers) so they can never
# drift apart again.
#
# Pricing is regional: PKR for Pakistan, USD for international. The USD prices
# sit on conventional SaaS price points rather than a strict FX conversion —
# that gap is deliberate purchasing-power pricing, not an error.
#
# "Unlimited" on Enterprise is fair-use limited. Genuinely uncapped usage is the
# one way this business can lose money on a paying customer (spec §3.3), so the
# cap is enforced server-side and stated honestly in the UI.

ALL_AGENTS = ["progress_coach", "idea_watcher", "competitor_watcher", "pivot_suggester"]

TIER_CONFIG = {
    "free": {
        "label": "Free",
        "price_pkr": 0,
        "price_usd": 0,
        "credits_per_month": 100,        # ~3 full analyses
        "max_ideas": 3,
        "max_analyses_per_month": 3,
        "agents_allowed": ["progress_coach"],
        "premium_models": False,
        "rag_queries_per_day": 5,
        "websites_allowed": 0,           # Phase 3 AI website builder
        "unlimited_label": False,
    },
    "starter": {
        "label": "Starter",
        "price_pkr": 2500,
        "price_usd": 9,
        "credits_per_month": 500,        # ~16 full analyses
        "max_ideas": 15,
        "max_analyses_per_month": 15,
        "agents_allowed": ["progress_coach", "competitor_watcher"],
        "premium_models": False,
        "rag_queries_per_day": 50,
        "websites_allowed": 0,
        "unlimited_label": False,
    },
    "pro": {
        "label": "Pro",
        "price_pkr": 4500,
        "price_usd": 19,
        "credits_per_month": 2000,       # ~66 full analyses
        "max_ideas": 50,
        "max_analyses_per_month": 60,
        "agents_allowed": ALL_AGENTS,
        "premium_models": True,
        "rag_queries_per_day": 200,
        "websites_allowed": 1,
        "unlimited_label": False,
    },
    "enterprise": {
        "label": "Enterprise",
        "price_pkr": 14999,
        "price_usd": 49,
        "credits_per_month": 6000,       # ~200 analyses — the fair-use ceiling
        "max_ideas": 500,
        "max_analyses_per_month": 200,
        "agents_allowed": ALL_AGENTS,
        "premium_models": True,
        "rag_queries_per_day": 1000,
        "websites_allowed": 10,
        "unlimited_label": True,         # UI shows "Unlimited (fair use)"
    },
}

# Legacy tier names still present on existing user records. Mapping them here
# keeps current subscribers working after the rename — never delete these.
TIER_ALIASES = {
    "team": "enterprise",
}


def resolve_tier(tier: str) -> str:
    """Normalise a stored tier name to a current TIER_CONFIG key."""
    if not tier:
        return "free"
    tier = tier.lower()
    tier = TIER_ALIASES.get(tier, tier)
    return tier if tier in TIER_CONFIG else "free"


class CreditService:
    """Handles credit balance checks, deductions, grants, and audit logging."""

    @staticmethod
    async def get_balance(db, user_id: int) -> int:
        """Get current credit balance for a user."""
        user = await db.users.find_one({"id": user_id})
        if not user:
            return 0
        return user.get("credit_balance", 0)

    @staticmethod
    async def get_tier(db, user_id: int) -> str:
        """
        Current subscription tier for a user, normalised.

        Resolving here means every downstream caller — gating, credit grants,
        the billing page — automatically handles legacy tier names.
        """
        user = await db.users.find_one({"id": user_id})
        if not user:
            return "free"
        return resolve_tier(user.get("subscription_tier", "free"))

    @staticmethod
    async def get_tier_config(db, user_id: int) -> dict:
        """Get full tier configuration for a user."""
        tier = await CreditService.get_tier(db, user_id)
        return TIER_CONFIG.get(tier, TIER_CONFIG["free"])

    @staticmethod
    async def can_afford(db, user_id: int, operation: str) -> tuple[bool, int, int]:
        """
        Check if user can afford an operation.
        Returns: (can_afford, cost, current_balance)
        """
        cost = CREDIT_COSTS.get(operation, 0)
        if cost == 0:
            return True, 0, 0

        balance = await CreditService.get_balance(db, user_id)
        return balance >= cost, cost, balance

    @staticmethod
    async def deduct(db, user_id: int, operation: str, idea_id: int = None) -> dict:
        """
        Deduct credits AFTER a successful operation.
        Returns: {"success": True, "new_balance": int} or {"success": False, "error": str}
        """
        cost = CREDIT_COSTS.get(operation, 0)
        if cost == 0:
            return {"success": True, "new_balance": await CreditService.get_balance(db, user_id)}

        # Atomic deduct + balance check
        result = await db.users.find_one_and_update(
            {"id": user_id, "credit_balance": {"$gte": cost}},
            {"$inc": {"credit_balance": -cost}},
            return_document=True,
        )

        if not result:
            balance = await CreditService.get_balance(db, user_id)
            return {
                "success": False,
                "error": f"Insufficient credits. Need {cost}, have {balance}.",
                "balance": balance,
                "cost": cost,
            }

        new_balance = result.get("credit_balance", 0)

        # Log the transaction
        await CreditService._log_transaction(
            db, user_id, -cost, operation, idea_id, new_balance
        )

        return {"success": True, "new_balance": new_balance}

    @staticmethod
    async def grant(db, user_id: int, amount: int, reason: str, idea_id: int = None) -> dict:
        """
        Grant credits to a user (subscription renewal, refund, admin grant).
        """
        result = await db.users.find_one_and_update(
            {"id": user_id},
            {"$inc": {"credit_balance": amount}},
            return_document=True,
        )

        if not result:
            return {"success": False, "error": "User not found"}

        new_balance = result.get("credit_balance", 0)

        await CreditService._log_transaction(
            db, user_id, amount, reason, idea_id, new_balance
        )

        return {"success": True, "new_balance": new_balance}

    @staticmethod
    async def reset_for_subscription(db, user_id: int, tier: str) -> dict:
        """
        Reset credits on subscription renewal.
        RESET to tier amount, don't accumulate.
        """
        tier_credits = TIER_CONFIG.get(tier, TIER_CONFIG["free"])["credits_per_month"]

        result = await db.users.find_one_and_update(
            {"id": user_id},
            {"$set": {"credit_balance": tier_credits, "subscription_tier": tier}},
            return_document=True,
        )

        if not result:
            return {"success": False, "error": "User not found"}

        await CreditService._log_transaction(
            db, user_id, tier_credits, "subscription_grant", None, tier_credits
        )

        return {"success": True, "new_balance": tier_credits, "tier": tier}

    @staticmethod
    async def get_transaction_history(db, user_id: int, limit: int = 50) -> list:
        """Get recent credit transactions for a user."""
        cursor = db.credit_transactions.find(
            {"user_id": user_id}
        ).sort("created_at", -1).limit(limit)

        transactions = []
        async for doc in cursor:
            t = {k: v for k, v in doc.items() if k != "_id"}
            if isinstance(t.get("created_at"), datetime):
                t["created_at"] = t["created_at"].isoformat()
            transactions.append(t)

        return transactions

    @staticmethod
    async def check_idea_limit(db, user_id: int) -> tuple[bool, int, int]:
        """Check if user can create more ideas based on tier."""
        tier_config = await CreditService.get_tier_config(db, user_id)
        max_ideas = tier_config["max_ideas"]

        current_ideas = await db.ideas.count_documents({"user_id": user_id})
        return current_ideas < max_ideas, current_ideas, max_ideas

    @staticmethod
    async def check_analysis_limit(db, user_id: int) -> tuple[bool, int, int]:
        """Check if user can run more analyses this month based on tier."""
        tier_config = await CreditService.get_tier_config(db, user_id)
        max_analyses = tier_config["max_analyses_per_month"]

        # Count analyses this month
        now = datetime.utcnow()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        analyses_this_month = await db.credit_transactions.count_documents({
            "user_id": user_id,
            "reason": {"$in": ["analysis", "reanalyze"]},
            "created_at": {"$gte": month_start},
        })

        return analyses_this_month < max_analyses, analyses_this_month, max_analyses

    # ─── Internal ──────────────────────────────────────────────────────────

    @staticmethod
    async def _log_transaction(db, user_id: int, amount: int, reason: str,
                                idea_id: int = None, balance_after: int = 0):
        """Insert an audit trail entry in credit_transactions."""

        # Auto-increment ID
        counter = await db.counters.find_one_and_update(
            {"_id": "credit_transactions"}, {"$inc": {"seq": 1}},
            upsert=True, return_document=True,
        )

        await db.credit_transactions.insert_one({
            "id": counter["seq"],
            "user_id": user_id,
            "amount": amount,
            "reason": reason,
            "related_idea_id": idea_id,
            "balance_after": balance_after,
            "created_at": datetime.utcnow(),
        })


# ─── Enforcement helper ────────────────────────────────────────────────────────

async def require_credits(db, user_id: int, operation: str) -> int:
    """
    Gate an operation on the user's credit balance.

    Raises HTTP 402 (Payment Required) with a machine-readable body so the
    frontend can render an upgrade prompt instead of a generic error toast.
    402 is used deliberately: 403 already means "not allowed", and the UI must
    be able to tell "you cannot do this" apart from "you need more credits".

    Returns the credit cost so the caller can deduct it AFTER the operation
    succeeds — credits are never taken for work that failed.
    """
    from fastapi import HTTPException

    can_afford, cost, balance = await CreditService.can_afford(db, user_id, operation)
    if can_afford:
        return cost

    tier = await CreditService.get_tier(db, user_id)
    config = TIER_CONFIG.get(tier, TIER_CONFIG["free"])

    raise HTTPException(
        status_code=402,
        detail={
            "error": "insufficient_credits",
            "message": (
                f"You need {cost} credits for this, and you have {balance}."
            ),
            "operation": operation,
            "cost": cost,
            "balance": balance,
            "tier": tier,
            "tier_label": config.get("label", tier.title()),
            "monthly_credits": config.get("credits_per_month", 0),
            "upgrade_url": "/dashboard/billing",
        },
    )


async def require_idea_slot(db, user_id: int) -> None:
    """
    Gate idea creation on the tier's idea limit.

    Same 402 contract as require_credits so the frontend can use one handler
    for both "out of credits" and "hit your plan's idea limit".
    """
    from fastapi import HTTPException

    can_create, current, maximum = await CreditService.check_idea_limit(db, user_id)
    if can_create:
        return

    tier = await CreditService.get_tier(db, user_id)
    config = TIER_CONFIG.get(tier, TIER_CONFIG["free"])

    raise HTTPException(
        status_code=402,
        detail={
            "error": "idea_limit_reached",
            "message": (
                f"Your {config.get('label', tier.title())} plan includes {maximum} "
                f"ideas and you're using all {current}."
            ),
            "current": current,
            "maximum": maximum,
            "tier": tier,
            "tier_label": config.get("label", tier.title()),
            "upgrade_url": "/dashboard/billing",
        },
    )
