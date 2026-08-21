"""
Billing Router — Credit balance, history, tier info, checkout, and webhooks.

Endpoints:
    GET   /api/billing/balance      — Current credit balance + tier info
    GET   /api/billing/history      — Credit transaction history
    GET   /api/billing/costs        — Credit cost table for all operations
    GET   /api/billing/tier         — Current tier details + limits
    POST  /api/billing/checkout     — Create LemonSqueezy checkout session
    POST  /api/billing/webhook      — LemonSqueezy webhook receiver
    POST  /api/billing/cancel       — Cancel subscription
    POST  /api/billing/resume       — Resume cancelled subscription
    GET   /api/billing/subscription — Current subscription details
"""

import json
import traceback
from datetime import datetime
from fastapi import APIRouter, Depends, Request, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import Optional

from app_fastapi.dependencies import get_current_user
import logging

from app_fastapi.services.credit_service import (
    CreditService,
    CREDIT_COSTS,
    TIER_CONFIG,
    resolve_tier,
)

logger = logging.getLogger(__name__)

router = APIRouter()


# ─── Request Schemas ──────────────────────────────────────────────────────────

class CheckoutRequest(BaseModel):
    plan: str = Field(..., description="Plan: pro_monthly, pro_yearly, team_monthly, team_yearly")


# ─── Balance & History ────────────────────────────────────────────────────────

@router.get("/balance")
async def get_credit_balance(current_user: dict = Depends(get_current_user)):
    """Get current credit balance and tier."""
    from app_fastapi import get_db
    db = get_db()

    user_id = current_user["id"]
    balance = await CreditService.get_balance(db, user_id)
    tier = await CreditService.get_tier(db, user_id)
    tier_config = TIER_CONFIG.get(tier, TIER_CONFIG["free"])

    return {
        "credit_balance": balance,
        "subscription_tier": tier,
        "credits_per_month": tier_config["credits_per_month"],
        "max_ideas": tier_config["max_ideas"],
        "max_analyses_per_month": tier_config["max_analyses_per_month"],
        "premium_models": tier_config["premium_models"],
    }


@router.get("/history")
async def get_credit_history(current_user: dict = Depends(get_current_user)):
    """Get recent credit transaction history."""
    from app_fastapi import get_db
    db = get_db()

    transactions = await CreditService.get_transaction_history(db, current_user["id"])
    balance = await CreditService.get_balance(db, current_user["id"])

    return {
        "transactions": transactions,
        "current_balance": balance,
    }


@router.get("/costs")
async def get_credit_costs():
    """Public endpoint: show credit costs for all operations."""
    return {
        "costs": CREDIT_COSTS,
        "tiers": {
            tier: {
                "credits_per_month": config["credits_per_month"],
                "max_ideas": config["max_ideas"],
                "premium_models": config["premium_models"],
            }
            for tier, config in TIER_CONFIG.items()
        },
    }


@router.get("/tiers")
async def get_public_tiers(currency: str = "USD"):
    """
    Public pricing — the single source of truth for the billing page.

    The frontend renders whatever this returns, so pricing can never drift
    between the app and the pitch deck again. `currency` selects the regional
    price book: PKR for Pakistan, USD everywhere else.
    """
    currency = currency.upper()
    if currency not in ("PKR", "USD"):
        currency = "USD"

    price_key = "price_pkr" if currency == "PKR" else "price_usd"
    symbol = "PKR " if currency == "PKR" else "$"

    order = ["free", "starter", "pro", "enterprise"]
    tiers = []

    for name in order:
        config = TIER_CONFIG[name]
        amount = config[price_key]
        tiers.append({
            "id": name,
            "label": config["label"],
            "currency": currency,
            "price": amount,
            "price_display": f"{symbol}{amount:,}" if amount else "Free",
            "credits_per_month": config["credits_per_month"],
            "max_ideas": config["max_ideas"],
            "max_analyses_per_month": config["max_analyses_per_month"],
            # Enterprise markets itself as unlimited; the number is the honest
            # fair-use ceiling, surfaced so the UI can say both.
            "analyses_display": (
                f"Unlimited (fair use: {config['max_analyses_per_month']}/mo)"
                if config["unlimited_label"]
                else f"{config['max_analyses_per_month']} validations/mo"
            ),
            "agents_allowed": config["agents_allowed"],
            "premium_models": config["premium_models"],
            "rag_queries_per_day": config["rag_queries_per_day"],
            "websites_allowed": config["websites_allowed"],
            "recommended": name == "pro",
        })

    return {"currency": currency, "tiers": tiers}


@router.get("/tier")
async def get_tier_details(current_user: dict = Depends(get_current_user)):
    """Get full tier details with usage stats."""
    from app_fastapi import get_db
    db = get_db()

    user_id = current_user["id"]
    tier = await CreditService.get_tier(db, user_id)
    tier_config = TIER_CONFIG.get(tier, TIER_CONFIG["free"])

    can_create, current_ideas, max_ideas = await CreditService.check_idea_limit(db, user_id)
    can_analyze, analyses_used, max_analyses = await CreditService.check_analysis_limit(db, user_id)
    balance = await CreditService.get_balance(db, user_id)

    return {
        "tier": tier,
        "config": tier_config,
        "usage": {
            "credit_balance": balance,
            "credits_per_month": tier_config["credits_per_month"],
            "ideas_created": current_ideas,
            "max_ideas": max_ideas,
            "can_create_idea": can_create,
            "analyses_this_month": analyses_used,
            "max_analyses": max_analyses,
            "can_run_analysis": can_analyze,
        },
    }


# ─── LemonSqueezy Checkout ───────────────────────────────────────────────────

@router.post("/checkout")
async def create_checkout(body: CheckoutRequest, current_user: dict = Depends(get_current_user)):
    """Create a LemonSqueezy checkout session for plan upgrade."""
    from app_fastapi.services.lemonsqueezy_service import LemonSqueezyService

    result = await LemonSqueezyService.create_checkout(
        user_id=current_user["id"],
        user_email=current_user.get("email", ""),
        plan=body.plan,
    )

    if "error" in result:
        return JSONResponse(
            content={"status": "error", "message": result["error"]},
            status_code=400,
        )

    return {"status": "success", "checkout_url": result["url"], "checkout_id": result["checkout_id"]}


# ─── Subscription Management ─────────────────────────────────────────────────

@router.get("/subscription")
async def get_subscription(current_user: dict = Depends(get_current_user)):
    """Get current subscription details."""
    from app_fastapi import get_db
    db = get_db()

    user = await db.users.find_one({"id": current_user["id"]})
    sub_id = user.get("lemon_subscription_id") if user else None

    if not sub_id:
        return {
            "has_subscription": False,
            "tier": user.get("subscription_tier", "free") if user else "free",
        }

    from app_fastapi.services.lemonsqueezy_service import LemonSqueezyService
    sub_data = await LemonSqueezyService.get_subscription(sub_id)

    return {
        "has_subscription": True,
        "subscription_id": sub_id,
        "tier": user.get("subscription_tier", "free"),
        "status": sub_data["attributes"]["status"] if sub_data else "unknown",
        "renews_at": sub_data["attributes"].get("renews_at") if sub_data else None,
        "ends_at": sub_data["attributes"].get("ends_at") if sub_data else None,
    }


@router.post("/cancel")
async def cancel_subscription(current_user: dict = Depends(get_current_user)):
    """Cancel the current subscription (remains active until period end)."""
    from app_fastapi import get_db
    db = get_db()

    user = await db.users.find_one({"id": current_user["id"]})
    sub_id = user.get("lemon_subscription_id") if user else None

    if not sub_id:
        raise HTTPException(status_code=400, detail="No active subscription found")

    from app_fastapi.services.lemonsqueezy_service import LemonSqueezyService
    result = await LemonSqueezyService.cancel_subscription(sub_id)

    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"subscription_status": "cancelling"}},
    )

    return {"status": "success", "message": result["message"]}


@router.post("/resume")
async def resume_subscription(current_user: dict = Depends(get_current_user)):
    """Resume a cancelled subscription before period ends."""
    from app_fastapi import get_db
    db = get_db()

    user = await db.users.find_one({"id": current_user["id"]})
    sub_id = user.get("lemon_subscription_id") if user else None

    if not sub_id:
        raise HTTPException(status_code=400, detail="No subscription to resume")

    from app_fastapi.services.lemonsqueezy_service import LemonSqueezyService
    result = await LemonSqueezyService.resume_subscription(sub_id)

    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"subscription_status": "active"}},
    )

    return {"status": "success", "message": result["message"]}


# ─── LemonSqueezy Webhook ────────────────────────────────────────────────────

# Map LemonSqueezy variant IDs to tiers (reverse lookup)
VARIANT_TO_TIER = {}  # Populated at import from env


async def _send_revenue_notifications(db, event_name: str, user_id: int, tier: str, attrs: dict):
    """
    Tell the founder when money moves, and welcome the customer when they join.

    Deliberately swallows every error: an email problem must never fail the
    webhook, because LemonSqueezy would then retry an event whose credits and
    tier change have already been applied.
    """
    import asyncio
    import os

    NOTIFY = {
        "subscription_created":        ("New subscriber", "🎉"),
        "subscription_cancelled":      ("Subscription cancelled", "⚠️"),
        "subscription_payment_failed": ("Payment failed", "⚠️"),
        "order_refunded":              ("Refund issued", "↩️"),
    }
    if event_name not in NOTIFY:
        return

    try:
        from app.services.email_service import EmailService

        headline, _ = NOTIFY[event_name]
        user = await db.users.find_one({"id": user_id}) or {}
        customer_email = user.get("email", "unknown")
        customer_name = f"{user.get('first_name', '')} {user.get('last_name', '')}".strip() or "Unknown"
        plan = TIER_CONFIG.get(tier, {}).get("label", tier.title())

        total_paid = await db.users.count_documents(
            {"subscription_tier": {"$nin": ["free", None]}}
        )

        # ── Founder notification ──────────────────────────────────────────
        admin_email = os.environ.get("ADMIN_EMAIL", "")
        if admin_email:
            admin_html = f"""
            <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;">
              <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:22px 24px;border-radius:12px 12px 0 0;">
                <h1 style="color:#fff;margin:0;font-size:19px;">{headline}</h1>
                <p style="color:rgba(255,255,255,0.82);margin:4px 0 0;font-size:13px;">Inceptrax billing</p>
              </div>
              <div style="background:#fff;padding:22px 24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
                <table style="width:100%;font-size:14px;color:#374151;border-collapse:collapse;">
                  <tr><td style="padding:6px 0;color:#6b7280;">Customer</td><td style="padding:6px 0;font-weight:600;">{customer_name}</td></tr>
                  <tr><td style="padding:6px 0;color:#6b7280;">Email</td><td style="padding:6px 0;font-weight:600;">{customer_email}</td></tr>
                  <tr><td style="padding:6px 0;color:#6b7280;">Plan</td><td style="padding:6px 0;font-weight:600;">{plan}</td></tr>
                  <tr><td style="padding:6px 0;color:#6b7280;">Event</td><td style="padding:6px 0;font-family:monospace;font-size:12px;">{event_name}</td></tr>
                </table>
                <p style="margin:18px 0 0;padding-top:14px;border-top:1px solid #e5e7eb;font-size:13px;color:#6b7280;">
                  Total paying customers: <strong style="color:#4338ca;">{total_paid}</strong>
                </p>
              </div>
            </div>"""
            await asyncio.to_thread(
                EmailService.send_email,
                admin_email,
                f"{headline} — {plan} ({customer_email})",
                admin_html,
            )

        # ── Customer welcome (new subscriptions only) ─────────────────────
        if event_name == "subscription_created" and customer_email != "unknown":
            frontend = os.environ.get("FRONTEND_URL", "https://www.inceptrax.com").rstrip("/")
            credits = TIER_CONFIG.get(tier, {}).get("credits_per_month", 0)
            first_name = user.get("first_name") or "there"

            customer_html = f"""
            <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;">
              <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:26px 28px;border-radius:12px 12px 0 0;">
                <h1 style="color:#fff;margin:0;font-size:21px;">Welcome to Inceptrax {plan}</h1>
              </div>
              <div style="background:#fff;padding:26px 28px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
                <p style="margin:0 0 14px;color:#111827;font-size:15px;">Hi {first_name},</p>
                <p style="margin:0 0 16px;color:#374151;font-size:14px;line-height:1.65;">
                  Thank you for upgrading. Your {plan} plan is active and
                  <strong>{credits:,} credits</strong> have been added to your account.
                </p>
                <p style="margin:0 0 22px;color:#374151;font-size:14px;line-height:1.65;">
                  If anything at all gets in your way, just reply to this email — it reaches us directly.
                </p>
                <a href="{frontend}/dashboard" style="display:inline-block;background:#6366f1;color:#fff;
                   padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;">
                  Open your dashboard</a>
                <p style="margin:22px 0 0;padding-top:16px;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px;">
                  Credits reset at the start of each billing period.
                </p>
              </div>
            </div>"""
            await asyncio.to_thread(
                EmailService.send_email,
                customer_email,
                f"Welcome to Inceptrax {plan}",
                customer_html,
            )

    except Exception as e:
        logger.warning("[Webhook] Revenue notification failed for %s: %s", event_name, e)


def _get_tier_from_variant(variant_id: str) -> str:
    """
    Map a LemonSqueezy variant ID to a subscription tier.

    Built from the same VARIANT_IDS table the checkout uses, so the two can
    never disagree about which product means which tier.

    An unrecognised variant means a product exists in LemonSqueezy that this
    deployment doesn't know about — a configuration error, not a customer
    error. We grant the lowest paid tier (so a paying customer is never left
    with nothing) and log loudly so it gets corrected, rather than silently
    handing out the most expensive plan.
    """
    from app_fastapi.services.lemonsqueezy_service import LemonSqueezyService

    variant_id = str(variant_id or "")
    if not variant_id:
        logger.error("[Webhook] Subscription event carried no variant_id")
        return "starter"

    for plan_key, configured_id in LemonSqueezyService.VARIANT_IDS.items():
        if configured_id and str(configured_id) == variant_id:
            # plan_key looks like "pro_monthly" / "enterprise_yearly"
            tier = plan_key.rsplit("_", 1)[0]
            return resolve_tier(tier)

    logger.error(
        "[Webhook] Unrecognised variant_id %s — no matching LEMONSQUEEZY_*_VARIANT_ID "
        "is configured. Granting 'starter'; set the variant IDs to fix this.",
        variant_id,
    )
    return "starter"


@router.post("/webhook")
async def lemon_webhook(request: Request):
    """
    LemonSqueezy webhook receiver.
    Verifies HMAC-SHA256 signature, processes subscription events.
    """
    from app_fastapi import get_db
    from app_fastapi.services.lemonsqueezy_service import LemonSqueezyService

    # ─── Verify signature ─────────────────────────────────────────────────
    raw_body = await request.body()
    signature = request.headers.get("X-Signature", "")

    if not LemonSqueezyService.verify_webhook(raw_body, signature):
        print("[Webhook] Invalid signature — rejecting")
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

    # ─── Parse event ──────────────────────────────────────────────────────
    try:
        payload = json.loads(raw_body)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    event_name = payload.get("meta", {}).get("event_name", "")
    event_id = payload.get("meta", {}).get("webhook_id", "")

    db = get_db()

    # ─── Idempotency check ────────────────────────────────────────────────
    if event_id:
        existing = await db.processed_webhooks.find_one({"webhook_id": event_id})
        if existing:
            print(f"[Webhook] Duplicate event {event_id} — skipping")
            return {"status": "ok", "message": "Already processed"}

    # ─── Extract data ─────────────────────────────────────────────────────
    attrs = payload.get("data", {}).get("attributes", {})
    custom_data = payload.get("meta", {}).get("custom_data", {})
    user_id_str = custom_data.get("user_id") or attrs.get("custom_data", {}).get("user_id", "")

    # For subscription events, user_id might be in first_order custom data
    if not user_id_str:
        first_sub_item = attrs.get("first_subscription_item", {})
        user_id_str = custom_data.get("user_id", "")

    if not user_id_str:
        print(f"[Webhook] No user_id in event {event_name}")
        # Store webhook but can't process without user_id
        await _store_webhook_event(db, event_id, event_name, payload, processed=False)
        return {"status": "ok", "message": "No user_id found"}

    try:
        user_id = int(user_id_str)
    except (ValueError, TypeError):
        print(f"[Webhook] Invalid user_id: {user_id_str}")
        return {"status": "ok"}

    variant_id = str(attrs.get("variant_id", ""))
    subscription_id = str(payload.get("data", {}).get("id", ""))
    tier = _get_tier_from_variant(variant_id)

    print(f"[Webhook] Processing {event_name} for user #{user_id}, tier={tier}")

    # ─── Handle events ────────────────────────────────────────────────────
    try:
        if event_name == "subscription_created":
            await _handle_subscription_created(db, user_id, tier, subscription_id)

        elif event_name == "subscription_updated":
            await _handle_subscription_updated(db, user_id, tier, attrs)

        elif event_name == "subscription_cancelled":
            await _handle_subscription_cancelled(db, user_id)

        elif event_name == "subscription_expired":
            await _handle_subscription_expired(db, user_id)

        elif event_name == "subscription_payment_success":
            await _handle_payment_success(db, user_id, tier)

        elif event_name == "subscription_payment_failed":
            await _handle_payment_failed(db, user_id)

        elif event_name == "order_refunded":
            await _handle_refund(db, user_id)

        else:
            print(f"[Webhook] Unhandled event: {event_name}")

        # Revenue notifications are best-effort: a mail failure must never
        # cause the webhook to error, or LemonSqueezy will retry a payment
        # event that has already been applied.
        await _send_revenue_notifications(db, event_name, user_id, tier, attrs)

    except Exception as e:
        print(f"[Webhook] Error processing {event_name}: {e}")
        traceback.print_exc()

    # ─── Store processed webhook ──────────────────────────────────────────
    await _store_webhook_event(db, event_id, event_name, payload, processed=True)

    return {"status": "ok"}


# ─── Webhook Handlers ─────────────────────────────────────────────────────────

async def _handle_subscription_created(db, user_id: int, tier: str, subscription_id: str):
    """New subscription — set tier, grant credits, store subscription ID."""
    result = await CreditService.reset_for_subscription(db, user_id, tier)
    await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "lemon_subscription_id": subscription_id,
            "subscription_status": "active",
            "subscription_started_at": datetime.utcnow(),
        }},
    )
    print(f"[Webhook] Subscription created: user #{user_id} → {tier}")


async def _handle_subscription_updated(db, user_id: int, tier: str, attrs: dict):
    """Subscription updated (upgrade/downgrade)."""
    current_user = await db.users.find_one({"id": user_id})
    current_tier = current_user.get("subscription_tier", "free") if current_user else "free"

    if tier != current_tier:
        await CreditService.reset_for_subscription(db, user_id, tier)
        print(f"[Webhook] Tier changed: user #{user_id} {current_tier} → {tier}")


async def _handle_subscription_cancelled(db, user_id: int):
    """Subscription cancelled — keep tier until period_end."""
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"subscription_status": "cancelling"}},
    )
    print(f"[Webhook] Subscription cancelling for user #{user_id}")


async def _handle_subscription_expired(db, user_id: int):
    """Subscription expired — drop to free tier."""
    await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "subscription_tier": "free",
            "subscription_status": "expired",
            "credit_balance": 0,
            "lemon_subscription_id": None,
        }},
    )
    await CreditService._log_transaction(db, user_id, 0, "subscription_expired")
    print(f"[Webhook] Subscription expired for user #{user_id} — dropped to free")


async def _handle_payment_success(db, user_id: int, tier: str):
    """Monthly payment success — RESET credits to tier amount (don't accumulate)."""
    await CreditService.reset_for_subscription(db, user_id, tier)
    print(f"[Webhook] Payment success for user #{user_id} — credits reset to {tier}")


async def _handle_payment_failed(db, user_id: int):
    """Payment failed — grace period, email user."""
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"subscription_status": "past_due"}},
    )
    print(f"[Webhook] Payment failed for user #{user_id} — marking past_due")


async def _handle_refund(db, user_id: int):
    """
    Order refunded — drop tier and revoke credits immediately.

    Also records a refund counter. Subscribe → burn credits → refund is the
    standard abuse pattern against usage-based SaaS, and the only reliable
    signal is repetition: one refund is a customer, three is a pattern.
    Keeping the count lets support (and later, automated gating) act on it.
    """
    from datetime import datetime

    await db.users.update_one(
        {"id": user_id},
        {
            "$set": {
                "subscription_tier": "free",
                "subscription_status": "refunded",
                "credit_balance": 0,
                "lemon_subscription_id": None,
                "last_refunded_at": datetime.utcnow(),
            },
            "$inc": {"refund_count": 1},
        },
    )

    user = await db.users.find_one({"id": user_id}, {"refund_count": 1, "email": 1}) or {}
    count = user.get("refund_count", 1)

    await CreditService._log_transaction(db, user_id, 0, "refund_tier_drop")
    print(f"[Webhook] Refund processed for user #{user_id} — dropped to free (refund #{count})")

    if count >= 2:
        logger.warning(
            "[Webhook] User #%s (%s) has now refunded %s times — review for abuse.",
            user_id, user.get("email", "unknown"), count,
        )


async def _store_webhook_event(db, webhook_id: str, event_name: str, payload: dict, processed: bool):
    """Store webhook event for audit trail and idempotency."""
    await db.processed_webhooks.insert_one({
        "webhook_id": webhook_id,
        "event_name": event_name,
        "processed": processed,
        "created_at": datetime.utcnow(),
    })
