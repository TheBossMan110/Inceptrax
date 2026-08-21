"""
LemonSqueezy Service — Checkout creation and subscription management.

Handles:
- Creating checkout sessions with user metadata
- Verifying webhook signatures (HMAC-SHA256)
- Processing subscription lifecycle events
"""

import os
import hmac
import hashlib
import httpx
from datetime import datetime
from typing import Optional


LEMONSQUEEZY_API_URL = "https://api.lemonsqueezy.com/v1"


class LemonSqueezyService:
    """LemonSqueezy payment integration for Inceptrax."""

    # ─── Test / Live mode ──────────────────────────────────────────────────
    #
    # LemonSqueezy test mode is a completely separate environment: its own
    # products, customers, orders and IDs. So every setting is looked up
    # mode-first, then falls back to the plain name:
    #
    #     LEMONSQUEEZY_MODE=test
    #       → LEMONSQUEEZY_TEST_API_KEY, else LEMONSQUEEZY_API_KEY
    #     LEMONSQUEEZY_MODE=live   (default)
    #       → LEMONSQUEEZY_LIVE_API_KEY, else LEMONSQUEEZY_API_KEY
    #
    # That means the existing unprefixed vars keep working untouched, and you
    # add TEST_-prefixed ones only for the sandbox. Switching the whole
    # integration is then a one-line env change, with no code edits.
    #
    # Everything is read at call time rather than import time, so changing the
    # environment takes effect on restart without depending on import order.

    PLANS = (
        "starter_monthly", "starter_yearly",
        "pro_monthly", "pro_yearly",
        "enterprise_monthly", "enterprise_yearly",
    )

    @staticmethod
    def mode() -> str:
        """Current integration mode: 'test' or 'live'."""
        value = (os.getenv("LEMONSQUEEZY_MODE") or "live").strip().lower()
        return "test" if value == "test" else "live"

    @classmethod
    def _cfg(cls, name: str, default: str = "") -> str:
        """Mode-aware env lookup with fallback to the unprefixed variable."""
        prefixed = os.getenv(f"LEMONSQUEEZY_{cls.mode().upper()}_{name}")
        if prefixed:
            return prefixed.strip()
        return (os.getenv(f"LEMONSQUEEZY_{name}") or default).strip()

    @classmethod
    def store_id(cls) -> str:
        return cls._cfg("STORE_ID")

    @classmethod
    def variant_ids(cls) -> dict:
        """Plan key → variant ID for the active mode."""
        ids = {
            plan: cls._cfg(f"{plan.upper()}_VARIANT_ID")
            for plan in cls.PLANS
        }
        # Enterprise was previously called "team". Fall back to the old vars so
        # nothing has to be re-entered, and keep the legacy plan keys resolvable
        # for any checkout link created before the rename.
        for interval in ("monthly", "yearly"):
            legacy = cls._cfg(f"TEAM_{interval.upper()}_VARIANT_ID")
            if legacy:
                ids.setdefault(f"team_{interval}", legacy)
                if not ids.get(f"enterprise_{interval}"):
                    ids[f"enterprise_{interval}"] = legacy
        return ids

    # Backwards-compatible alias. Existing callers read `.VARIANT_IDS`; this
    # keeps them working while making the value mode-aware and always current.
    class _VariantIdsDescriptor:
        def __get__(self, obj, objtype=None):
            return (objtype or type(obj)).variant_ids()

    VARIANT_IDS = _VariantIdsDescriptor()

    @classmethod
    def _get_api_key(cls) -> str:
        return cls._cfg("API_KEY")

    # Legacy attribute — some call sites still read STORE_ID directly.
    class _StoreIdDescriptor:
        def __get__(self, obj, objtype=None):
            return (objtype or type(obj)).store_id()

    STORE_ID = _StoreIdDescriptor()

    @staticmethod
    def _get_webhook_secret() -> str:
        return os.getenv("LEMONSQUEEZY_WEBHOOK_SECRET", "")

    @staticmethod
    def _headers() -> dict:
        return {
            "Authorization": f"Bearer {LemonSqueezyService._get_api_key()}",
            "Accept": "application/vnd.api+json",
            "Content-Type": "application/vnd.api+json",
        }

    @classmethod
    async def create_checkout(
        cls,
        user_id: int,
        user_email: str,
        plan: str,  # e.g. "pro_monthly", "team_yearly"
        success_url: str = "",
    ) -> dict:
        """
        Create a LemonSqueezy checkout session.
        Returns: {"url": "https://...", "checkout_id": "..."}
        """
        if plan not in cls.VARIANT_IDS:
            return {"error": f"Unknown plan: {plan}"}

        variant_id = cls.VARIANT_IDS[plan]
        if not variant_id:
            # The plan is valid but has no product in LemonSqueezy yet. Say so
            # precisely — "Unknown plan" sends you hunting through code for a
            # bug that is actually a missing dashboard entry.
            env_var = f"LEMONSQUEEZY_{plan.upper()}_VARIANT_ID"
            return {
                "error": (
                    f"The {plan.replace('_', ' ')} plan is not available yet. "
                    f"Create the product in LemonSqueezy and set {env_var}."
                )
            }

        # Fall back to a hosted checkout link if the API cannot be used. The
        # API path is preferred (it creates a tracked checkout object), but a
        # share link carries the same custom data and fires the same webhooks,
        # so payments still work when the API key or store ID is unavailable.
        if not cls._get_api_key() or not cls.store_id():
            hosted = cls._hosted_checkout_url(plan, user_id, user_email, success_url)
            if hosted:
                return {"url": hosted, "checkout_id": "", "via": "hosted_link"}
            missing = "API key" if not cls._get_api_key() else "store ID"
            return {
                "error": (
                    f"LemonSqueezy {missing} not configured, and no hosted checkout "
                    f"link is set for {plan}. Set LEMONSQUEEZY_{cls.mode().upper()}_"
                    f"{plan.upper()}_CHECKOUT_URL as a fallback."
                )
            }

        payload = {
            "data": {
                "type": "checkouts",
                "attributes": {
                    "checkout_data": {
                        "email": user_email,
                        "custom": {
                            "user_id": str(user_id),
                        },
                    },
                    "product_options": {
                        "redirect_url": success_url or os.getenv(
                            "FRONTEND_URL", "http://localhost:3000"
                        ) + "/dashboard/billing/success",
                    },
                },
                "relationships": {
                    "store": {
                        "data": {"type": "stores", "id": cls.STORE_ID}
                    },
                    "variant": {
                        "data": {"type": "variants", "id": variant_id}
                    },
                },
            }
        }

        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                f"{LEMONSQUEEZY_API_URL}/checkouts",
                json=payload,
                headers=cls._headers(),
            )

        if resp.status_code not in (200, 201):
            # API rejected us (bad key, unactivated store). Try the hosted link
            # rather than dropping a paying customer at the checkout step.
            hosted = cls._hosted_checkout_url(plan, user_id, user_email, success_url)
            if hosted:
                return {"url": hosted, "checkout_id": "", "via": "hosted_link"}
            return {"error": f"LemonSqueezy API error: {resp.status_code} — {resp.text[:200]}"}

        data = resp.json()
        checkout_url = data["data"]["attributes"]["url"]
        checkout_id = data["data"]["id"]

        return {"url": checkout_url, "checkout_id": checkout_id, "via": "api"}

    @classmethod
    def _hosted_checkout_url(
        cls, plan: str, user_id: int, user_email: str, success_url: str = ""
    ) -> str:
        """
        Build a LemonSqueezy hosted checkout link with our custom data attached.

        Copy the link from the product's Share button in the dashboard and set
        it as LEMONSQUEEZY_<MODE>_<PLAN>_CHECKOUT_URL. The custom user_id is
        what lets the webhook match a payment back to an account, so it must be
        appended here exactly as the API path does it.
        """
        from urllib.parse import urlencode

        base = cls._cfg(f"{plan.upper()}_CHECKOUT_URL")
        if not base:
            return ""

        params = {
            "checkout[custom][user_id]": str(user_id),
        }
        if user_email:
            params["checkout[email]"] = user_email

        redirect = success_url or (
            os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")
            + "/dashboard/billing/success"
        )
        params["checkout[success_url]"] = redirect

        separator = "&" if "?" in base else "?"
        return f"{base}{separator}{urlencode(params)}"

    @classmethod
    async def get_subscription(cls, subscription_id: str) -> Optional[dict]:
        """Fetch a subscription from LemonSqueezy API."""
        if not cls._get_api_key():
            return None

        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                f"{LEMONSQUEEZY_API_URL}/subscriptions/{subscription_id}",
                headers=cls._headers(),
            )

        if resp.status_code == 200:
            return resp.json()["data"]
        return None

    @classmethod
    async def cancel_subscription(cls, subscription_id: str) -> dict:
        """Cancel a subscription (it remains active until period end)."""
        if not cls._get_api_key():
            return {"error": "LemonSqueezy API key not configured"}

        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.delete(
                f"{LEMONSQUEEZY_API_URL}/subscriptions/{subscription_id}",
                headers=cls._headers(),
            )

        if resp.status_code == 200:
            return {"success": True, "message": "Subscription cancelled. Active until period end."}
        return {"error": f"Cancel failed: {resp.status_code}"}

    @classmethod
    async def resume_subscription(cls, subscription_id: str) -> dict:
        """Resume a cancelled subscription (before period end)."""
        if not cls._get_api_key():
            return {"error": "LemonSqueezy API key not configured"}

        payload = {
            "data": {
                "type": "subscriptions",
                "id": subscription_id,
                "attributes": {"cancelled": False},
            }
        }

        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.patch(
                f"{LEMONSQUEEZY_API_URL}/subscriptions/{subscription_id}",
                json=payload,
                headers=cls._headers(),
            )

        if resp.status_code == 200:
            return {"success": True, "message": "Subscription resumed."}
        return {"error": f"Resume failed: {resp.status_code}"}

    @staticmethod
    def verify_webhook(raw_body: bytes, signature: str) -> bool:
        """Verify LemonSqueezy webhook HMAC-SHA256 signature."""
        secret = LemonSqueezyService._get_webhook_secret()
        if not secret or not signature:
            return False
        computed = hmac.new(
            secret.encode("utf-8"), raw_body, hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(computed, signature)
