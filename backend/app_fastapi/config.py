"""
Pydantic Settings for FastAPI application.

Validates all required environment variables at startup.
If any required var is missing, the app fails immediately
with a clear error — not 5 minutes later on first request.
"""

from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # ─── Core ──────────────────────────────────────────────────────────────
    app_env: str = Field(default="development", alias="APP_ENV")
    secret_key: str = Field(alias="SECRET_KEY")
    jwt_secret_key: str = Field(alias="JWT_SECRET_KEY")
    jwt_refresh_secret_key: str = Field(default="", alias="JWT_REFRESH_SECRET_KEY")
    jwt_access_expires_days: int = Field(default=7, alias="JWT_ACCESS_EXPIRES")
    jwt_refresh_expires_days: int = Field(default=30, alias="JWT_REFRESH_EXPIRES")

    # ─── Database ──────────────────────────────────────────────────────────
    mongodb_uri: str = Field(alias="MONGODB_URI")
    mongodb_db_name: str = Field(default="", alias="MONGODB_DB_NAME")

    # ─── Admin ─────────────────────────────────────────────────────────────
    admin_email: str = Field(default="Inceptrax921@gmail.com", alias="ADMIN_EMAIL")

    # ─── AI Providers ──────────────────────────────────────────────────────
    gemini_api_key: str = Field(default="", alias="GEMINI_API_KEY")
    gemini_model: str = Field(default="gemini-2.5-flash", alias="GEMINI_MODEL")

    # ─── Search ────────────────────────────────────────────────────────────
    serpapi_key: str = Field(default="", alias="SERPAPI_KEY")

    # ─── Email ─────────────────────────────────────────────────────────────
    resend_api_key: str = Field(default="", alias="RESEND_API_KEY")
    mail_username: str = Field(default="", alias="MAIL_USERNAME")
    mail_password: str = Field(default="", alias="MAIL_PASSWORD")

    # ─── Frontend ──────────────────────────────────────────────────────────
    frontend_url: str = Field(default="http://localhost:3000", alias="FRONTEND_URL")

    # ─── Background Jobs (Inngest) ────────────────────────────────────────
    inngest_event_key: str = Field(default="", alias="INNGEST_EVENT_KEY")
    inngest_signing_key: str = Field(default="", alias="INNGEST_SIGNING_KEY")

    # ─── Payments (LemonSqueezy) ──────────────────────────────────────────
    lemonsqueezy_api_key: str = Field(default="", alias="LEMONSQUEEZY_API_KEY")
    lemonsqueezy_store_id: str = Field(default="", alias="LEMONSQUEEZY_STORE_ID")
    lemonsqueezy_webhook_secret: str = Field(default="", alias="LEMONSQUEEZY_WEBHOOK_SECRET")
    lemonsqueezy_pro_monthly_variant_id: str = Field(default="", alias="LEMONSQUEEZY_PRO_MONTHLY_VARIANT_ID")
    lemonsqueezy_pro_yearly_variant_id: str = Field(default="", alias="LEMONSQUEEZY_PRO_YEARLY_VARIANT_ID")
    lemonsqueezy_team_monthly_variant_id: str = Field(default="", alias="LEMONSQUEEZY_TEAM_MONTHLY_VARIANT_ID")
    lemonsqueezy_team_yearly_variant_id: str = Field(default="", alias="LEMONSQUEEZY_TEAM_YEARLY_VARIANT_ID")

    # ─── Observability ─────────────────────────────────────────────────────
    sentry_dsn: str = Field(default="", alias="SENTRY_DSN")

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "populate_by_name": True,
        "extra": "ignore",
    }


# Singleton instance — raises ValidationError at import if required vars are missing
settings = Settings()
