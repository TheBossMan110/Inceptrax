"""
Inceptrax FastAPI Application — Phase 2 Migration

This module sets up the FastAPI application with:
- Async MongoDB via motor
- CORS middleware
- Sentry integration
- JWT auth via dependencies
- Pydantic v2 request/response models
- Rate limiting via slowapi

The Flask app in app/ continues to run in parallel during migration.
Once all routes are migrated, Flask will be removed.
"""

import os
import asyncio
import sentry_sdk
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app_fastapi.config import settings


# ─── Global async MongoDB ─────────────────────────────────────────────────────
motor_client: AsyncIOMotorClient | None = None
motor_db = None


def get_db():
    """Return the async MongoDB database instance."""
    return motor_db


# ─── Rate Limiter ──────────────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address, default_limits=["2000/day", "300/hour"])


# ─── Sentry ────────────────────────────────────────────────────────────────────
def _init_sentry():
    """Initialize Sentry error tracking. No-op if SENTRY_DSN is not set."""
    if not settings.sentry_dsn:
        print("[Sentry] SENTRY_DSN not set — error tracking disabled.")
        return

    def before_send(event, hint):
        """Scrub sensitive data from Sentry events."""
        if 'request' in event and 'data' in event['request']:
            data = event['request']['data']
            if isinstance(data, dict):
                sensitive_keys = {'password', 'token', 'secret', 'api_key',
                                  'authorization', 'cookie', 'refresh_token'}
                for key in list(data.keys()):
                    if key.lower() in sensitive_keys:
                        data[key] = '[FILTERED]'
        if 'request' in event and 'headers' in event['request']:
            headers = event['request']['headers']
            if isinstance(headers, dict):
                for key in list(headers.keys()):
                    if key.lower() in ('authorization', 'cookie', 'set-cookie'):
                        headers[key] = '[FILTERED]'
        return event

    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        traces_sample_rate=0.1,
        profiles_sample_rate=0.0,
        environment=settings.app_env,
        before_send=before_send,
        send_default_pii=False,
    )
    print(f"[Sentry] Initialized for environment: {settings.app_env}")


# ─── MongoDB Connection with Retry ────────────────────────────────────────────
MAX_RETRIES = 5
RETRY_BASE_DELAY = 2  # seconds


async def _connect_mongodb():
    """Connect to MongoDB with retry logic for transient DNS/network failures."""
    global motor_client, motor_db

    db_name = settings.mongodb_db_name
    if not db_name:
        db_name = settings.mongodb_uri.rsplit('/', 1)[-1].split('?')[0] if '/' in settings.mongodb_uri else 'inceptrax'

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            motor_client = AsyncIOMotorClient(
                settings.mongodb_uri,
                serverSelectionTimeoutMS=10000,
                connectTimeoutMS=10000,
            )
            motor_db = motor_client[db_name]
            await motor_client.admin.command("ping")
            print(f"[MongoDB] Connected to database: {db_name} (async motor)")
            return
        except Exception as e:
            delay = RETRY_BASE_DELAY * (2 ** (attempt - 1))
            if attempt < MAX_RETRIES:
                print(f"[MongoDB] Connection attempt {attempt}/{MAX_RETRIES} failed: {e}")
                print(f"[MongoDB] Retrying in {delay}s...")
                await asyncio.sleep(delay)
                # Close the failed client before retrying
                if motor_client:
                    motor_client.close()
                    motor_client = None
                    motor_db = None
            else:
                print(f"[MongoDB] All {MAX_RETRIES} connection attempts failed: {e}")
                raise


# ─── Lifespan ──────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events for the FastAPI app."""
    # ── Startup ──────────────────────────────────────────────────────────
    _init_sentry()
    await _connect_mongodb()
    await _ensure_indexes(motor_db)
    await _backfill_credit_fields(motor_db)
    print("[FastAPI] Application started successfully.")

    yield

    # ── Shutdown ─────────────────────────────────────────────────────────
    if motor_client:
        motor_client.close()
        print("[MongoDB] Connection closed.")


async def _ensure_indexes(db):
    """Create MongoDB indexes for query performance."""
    try:
        await db.users.create_index("email", unique=True)
        await db.users.create_index("id", unique=True)
        await db.ideas.create_index("id", unique=True)
        await db.ideas.create_index("user_id")
        await db.ideas.create_index("share_token")
        await db.ideas.create_index("is_public")
        await db.stage_results.create_index([("idea_id", 1), ("stage_name", 1)])
        await db.stage_results.create_index("id", unique=True)
        await db.token_blacklist.create_index("token", unique=True)
        await db.notifications.create_index("user_id")
        await db.notifications.create_index("id", unique=True)
        await db.messages.create_index("sender_id")
        await db.messages.create_index("receiver_id")
        await db.messages.create_index("id", unique=True)
        await db.comments.create_index("idea_id")
        await db.comments.create_index("id", unique=True)
        await db.competitor_watch.create_index("idea_id")
        await db.competitor_watch.create_index("id", unique=True)
        await db.counters.create_index("_id")
        # Credit system indexes
        await db.credit_transactions.create_index([("user_id", 1), ("created_at", -1)])
        await db.credit_transactions.create_index("id", unique=True)
        # Agent indexes (spec §15.2)
        await db.agent_runs.create_index([("agent_type", 1), ("idea_id", 1), ("status", 1)])
        await db.agent_runs.create_index([("idea_id", 1), ("started_at", -1)])
        await db.agent_runs.create_index("id", unique=True)
        await db.idea_watcher_runs.create_index([("idea_id", 1), ("created_at", -1)])
        await db.idea_watcher_runs.create_index("id", unique=True)
        await db.idea_watcher_settings.create_index("idea_id", unique=True)
        await db.pivot_suggestions.create_index([("idea_id", 1), ("created_at", -1)])
        await db.pivot_suggestions.create_index("id", unique=True)
        await db.idea_context.create_index([("idea_id", 1), ("user_id", 1)])
        await db.rag_queries.create_index([("user_id", 1), ("created_at", -1)])
        await db.competitor_snapshots.create_index([("idea_id", 1), ("snapshot_date", -1)])
        print("[MongoDB] Indexes created successfully.")
    except Exception as e:
        print(f"[MongoDB] Index creation warning: {e}")


async def _backfill_credit_fields(db):
    """Backfill credit_balance and subscription_tier for existing users."""
    try:
        result = await db.users.update_many(
            {"credit_balance": {"$exists": False}},
            {"$set": {"credit_balance": 50, "subscription_tier": "free"}},
        )
        if result.modified_count > 0:
            print(f"[Migration] Backfilled credit fields for {result.modified_count} users.")
    except Exception as e:
        print(f"[Migration] Backfill warning: {e}")


# ─── Create App ────────────────────────────────────────────────────────────────
def create_app() -> FastAPI:
    app = FastAPI(
        title="Inceptrax API",
        description="AI-powered startup idea validation platform",
        version="2.0.0",
        lifespan=lifespan,
    )

    # ─── CORS ─────────────────────────────────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            settings.frontend_url,
            "https://www.inceptrax.com",
            "https://inceptrax.com",
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:5173",
        ],
        allow_credentials=True,
        allow_headers=["Content-Type", "Authorization"],
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    )

    # ─── Rate Limiter ─────────────────────────────────────────────────────
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    # ─── Routers ──────────────────────────────────────────────────────────
    from app_fastapi.routers.auth_router import router as auth_router
    from app_fastapi.routers.user_router import router as user_router
    from app_fastapi.routers.health_router import router as health_router
    from app_fastapi.routers.idea_router import router as idea_router
    from app_fastapi.routers.idea_features_router import router as idea_features_router
    from app_fastapi.routers.idea_export_router import router as idea_export_router
    from app_fastapi.routers.chat_router import router as chat_router
    from app_fastapi.routers.cofounder_router import router as cofounder_router
    from app_fastapi.routers.admin_router import router as admin_router
    from app_fastapi.routers.notification_router import router as notification_router
    from app_fastapi.routers.contact_router import router as contact_router
    from app_fastapi.routers.billing_router import router as billing_router
    from app_fastapi.routers.rag_router import router as rag_router
    from app_fastapi.routers.agents_router import router as agents_router

    app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
    app.include_router(user_router, prefix="/api/users", tags=["users"])
    app.include_router(health_router, prefix="/api", tags=["health"])
    app.include_router(idea_router, prefix="/api/ideas", tags=["ideas"])
    app.include_router(idea_features_router, prefix="/api/ideas", tags=["ideas-features"])
    app.include_router(idea_export_router, prefix="/api/ideas", tags=["ideas-export"])
    app.include_router(chat_router, prefix="/api/chat", tags=["chat"])
    app.include_router(cofounder_router, prefix="/api/cofounder", tags=["cofounder"])
    app.include_router(admin_router, prefix="/api/admin", tags=["admin"])
    app.include_router(notification_router, prefix="/api/notifications", tags=["notifications"])
    app.include_router(contact_router, prefix="/api", tags=["contact"])
    app.include_router(billing_router, prefix="/api/billing", tags=["billing"])
    app.include_router(rag_router, prefix="/api/ideas", tags=["rag"])
    app.include_router(agents_router, prefix="/api/agents", tags=["agents"])

    # ─── Inngest Background Jobs ──────────────────────────────────────────
    try:
        import inngest.fast_api
        from app_fastapi.inngest_client import inngest_client
        from app_fastapi.inngest_functions.analysis import run_idea_analysis
        from app_fastapi.inngest_functions.competitor_scan import (
            competitor_weekly_scan,
            competitor_manual_scan,
        )
        from app_fastapi.inngest_functions.email import send_email
        from app_fastapi.inngest_functions.idea_watcher import (
            idea_watcher_weekly,
            idea_watcher_manual,
        )
        from app_fastapi.inngest_functions.progress_coach import (
            progress_coach_daily,
            progress_coach_manual,
        )
        from app_fastapi.inngest_functions.competitor_watcher import (
            competitor_watcher_weekly,
            competitor_watcher_manual,
        )
        from app_fastapi.inngest_functions.pivot_suggester import (
            pivot_manual,
            pivot_on_threat,
            pivot_on_disruption,
        )

        inngest.fast_api.serve(
            app,
            inngest_client,
            [
                run_idea_analysis,
                competitor_weekly_scan,
                competitor_manual_scan,
                send_email,
                idea_watcher_weekly,
                idea_watcher_manual,
                progress_coach_daily,
                progress_coach_manual,
                competitor_watcher_weekly,
                competitor_watcher_manual,
                pivot_manual,
                pivot_on_threat,
                pivot_on_disruption,
            ],
        )
        print("[Inngest] Background job functions registered.")
    except ImportError:
        print("[Inngest] inngest package not installed — background jobs disabled.")
    except Exception as e:
        print(f"[Inngest] Setup warning: {e}")

    return app
