"""
Auth Router — FastAPI migration of app/routes/auth_routes.py

Endpoints:
    POST /api/auth/register      — Create new account
    POST /api/auth/login         — Login with credentials
    GET  /api/auth/me            — Get current user profile
    POST /api/auth/logout        — Logout (blacklist token + clear cookie)
    POST /api/auth/refresh       — Refresh access token
    POST /api/auth/forgot-password   — Send password reset email
    POST /api/auth/reset-password/{token} — Reset password with token
"""

import jwt
import asyncio
import datetime
import os
from fastapi import APIRouter, Depends, HTTPException, Request, Response, Cookie
from fastapi.responses import JSONResponse
from typing import Optional

from app_fastapi.config import settings
from app_fastapi.dependencies import get_current_user, optional_bearer
from app_fastapi.services.credit_service import TIER_CONFIG
from app_fastapi.schemas import (
    RegisterRequest, LoginRequest, ForgotPasswordRequest,
    ResetPasswordRequest, RefreshTokenRequest,
)

router = APIRouter()

# Cookie config
IS_PRODUCTION = settings.app_env == "production"
COOKIE_MAX_AGE = 7 * 24 * 60 * 60  # 7 days


def _set_auth_cookie(response: Response, token: str):
    """Set httpOnly JWT cookie on the response."""
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=IS_PRODUCTION,
        samesite="none" if IS_PRODUCTION else "lax",
        max_age=COOKIE_MAX_AGE,
        path="/",
    )


def _clear_auth_cookie(response: Response):
    """Clear the httpOnly JWT cookie."""
    response.delete_cookie(
        key="access_token",
        httponly=True,
        secure=IS_PRODUCTION,
        samesite="none" if IS_PRODUCTION else "lax",
        path="/",
    )


# ─── Token generation ─────────────────────────────────────────────────────────

def _generate_tokens(user_id: int) -> tuple[str, str]:
    """Generate access + refresh JWT tokens."""
    secret = settings.jwt_secret_key or settings.secret_key

    access_token = jwt.encode({
        "sub": user_id,
        "type": "access",
        "exp": datetime.datetime.utcnow() + datetime.timedelta(days=settings.jwt_access_expires_days),
        "iat": datetime.datetime.utcnow(),
    }, secret, algorithm="HS256")

    refresh_token = jwt.encode({
        "sub": user_id,
        "type": "refresh",
        "exp": datetime.datetime.utcnow() + datetime.timedelta(days=settings.jwt_refresh_expires_days),
        "iat": datetime.datetime.utcnow(),
    }, secret, algorithm="HS256")

    return access_token, refresh_token


def _user_to_dict(user_doc: dict) -> dict:
    """Convert a MongoDB user document to a frontend-safe dict."""
    return {
        "id": user_doc.get("id"),
        "first_name": user_doc.get("first_name", ""),
        "last_name": user_doc.get("last_name", ""),
        "email": user_doc.get("email", ""),
        "is_admin": user_doc.get("is_admin", False),
        "api_credits_used": user_doc.get("api_credits_used", 0),
        "credit_balance": user_doc.get("credit_balance", 0),
        "subscription_tier": user_doc.get("subscription_tier", "free"),
        "created_at": user_doc["created_at"].isoformat() if isinstance(user_doc.get("created_at"), datetime.datetime) else str(user_doc.get("created_at", "")),
        "is_discoverable": user_doc.get("is_discoverable", False),
        "bio": user_doc.get("bio"),
        "skills": user_doc.get("skills"),
        "looking_for": user_doc.get("looking_for"),
        "linkedin_url": user_doc.get("linkedin_url"),
    }


def _validate_password(password: str) -> tuple[bool, str | None]:
    """Validate password strength."""
    if not password or len(password) < 8:
        return False, "Password must be at least 8 characters"
    if not any(c.isupper() for c in password):
        return False, "Password must contain at least one uppercase letter"
    if not any(c.islower() for c in password):
        return False, "Password must contain at least one lowercase letter"
    if not any(c.isdigit() for c in password):
        return False, "Password must contain at least one number"
    return True, None


async def _get_next_id(db, collection_name: str) -> int:
    """Get next auto-incrementing integer ID for a collection."""
    result = await db.counters.find_one_and_update(
        {"_id": collection_name},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True,
    )
    return result["seq"]


# ─── Routes ───────────────────────────────────────────────────────────────────

@router.post("/register", status_code=201)
async def register(body: RegisterRequest):
    """Create a new user account."""
    from app_fastapi import get_db
    db = get_db()

    # Validate password strength
    valid, error = _validate_password(body.password)
    if not valid:
        raise HTTPException(status_code=400, detail=error)

    # Check for existing user
    existing = await db.users.find_one({"email": body.email})
    if existing:
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    # Hash password (bcrypt is sync — wrap in thread)
    import bcrypt
    hashed = await asyncio.to_thread(
        bcrypt.hashpw, body.password.encode("utf-8"), bcrypt.gensalt(rounds=12)
    )

    # Create user document
    user_id = await _get_next_id(db, "users")
    user_doc = {
        "id": user_id,
        "first_name": body.first_name,
        "last_name": body.last_name,
        "email": body.email,
        "password_hash": hashed.decode("utf-8"),
        "created_at": datetime.datetime.utcnow(),
        "is_admin": False,
        "api_credits_used": 0,
        "is_discoverable": False,
        "bio": None,
        "skills": None,
        "looking_for": None,
        "linkedin_url": None,
        "credit_balance": TIER_CONFIG["free"]["credits_per_month"],
        "subscription_tier": "free",
    }
    await db.users.insert_one(user_doc)

    # Generate tokens
    access_token, refresh_token = _generate_tokens(user_id)

    response_data = {
        "message": "Account created successfully",
        "token": access_token,
        "refresh_token": refresh_token,
        "user": _user_to_dict(user_doc),
    }

    response = JSONResponse(content=response_data, status_code=201)
    _set_auth_cookie(response, access_token)
    return response


@router.post("/login")
async def login(body: LoginRequest):
    """Login with email and password."""
    from app_fastapi import get_db
    db = get_db()

    user_doc = await db.users.find_one({"email": body.email})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Check password (bcrypt is sync — wrap in thread)
    import bcrypt
    password_hash = user_doc.get("password_hash", "")

    if password_hash.startswith("$2b$") or password_hash.startswith("$2a$"):
        valid = await asyncio.to_thread(
            bcrypt.checkpw, body.password.encode("utf-8"), password_hash.encode("utf-8")
        )
    else:
        # Werkzeug hash fallback
        from werkzeug.security import check_password_hash
        valid = check_password_hash(password_hash, body.password)
        if valid:
            # Upgrade to bcrypt
            new_hash = await asyncio.to_thread(
                bcrypt.hashpw, body.password.encode("utf-8"), bcrypt.gensalt(rounds=12)
            )
            await db.users.update_one(
                {"_id": user_doc["_id"]},
                {"$set": {"password_hash": new_hash.decode("utf-8")}}
            )

    if not valid:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token, refresh_token = _generate_tokens(user_doc["id"])

    response_data = {
        "message": "Login successful",
        "token": access_token,
        "refresh_token": refresh_token,
        "user": _user_to_dict(user_doc),
    }

    response = JSONResponse(content=response_data, status_code=200)
    _set_auth_cookie(response, access_token)
    return response


@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current authenticated user's profile."""
    return {"user": _user_to_dict(current_user)}


@router.post("/logout")
async def logout(
    request: Request,
    access_token: Optional[str] = Cookie(None),
):
    """Logout: blacklist token + clear cookie."""
    from app_fastapi import get_db
    db = get_db()

    # Get token from cookie or header
    token = access_token
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]

    if token:
        # Blacklist the token
        existing = await db.token_blacklist.find_one({"token": token})
        if not existing:
            await db.token_blacklist.insert_one({
                "token": token,
                "blacklisted_at": datetime.datetime.utcnow(),
            })

    response = JSONResponse(content={"message": "Logged out successfully"})
    _clear_auth_cookie(response)
    return response


@router.post("/refresh")
async def refresh(
    request: Request,
    access_token: Optional[str] = Cookie(None),
    body: Optional[RefreshTokenRequest] = None,
):
    """Exchange a valid refresh token for a new access token."""
    from app_fastapi import get_db
    db = get_db()

    # Try cookie, then header, then body
    token = access_token
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
        elif body and body.refresh_token:
            token = body.refresh_token

    if not token:
        raise HTTPException(status_code=400, detail="Refresh token required")

    # Check blacklist
    blacklisted = await db.token_blacklist.find_one({"token": token})
    if blacklisted:
        raise HTTPException(status_code=401, detail="Token has been revoked")

    # Decode refresh token
    try:
        secret = settings.jwt_secret_key or settings.secret_key
        payload = jwt.decode(token, secret, algorithms=["HS256"])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user_id = payload["sub"]
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired. Please log in again.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token.")

    # Fetch user
    user_doc = await db.users.find_one({"id": user_id})
    if not user_doc:
        raise HTTPException(status_code=401, detail="User not found")

    # Generate new access token only
    new_access_token = jwt.encode({
        "sub": user_id,
        "type": "access",
        "exp": datetime.datetime.utcnow() + datetime.timedelta(days=settings.jwt_access_expires_days),
        "iat": datetime.datetime.utcnow(),
    }, secret, algorithm="HS256")

    response_data = {
        "token": new_access_token,
        "user": _user_to_dict(user_doc),
    }

    response = JSONResponse(content=response_data)
    _set_auth_cookie(response, new_access_token)
    return response


@router.post("/forgot-password")
async def forgot_password(body: ForgotPasswordRequest):
    """Send a password reset link. Always returns success (prevents email enumeration)."""
    from app_fastapi import get_db
    db = get_db()

    user_doc = await db.users.find_one({"email": body.email})
    if user_doc:
        secret = settings.jwt_secret_key or settings.secret_key
        reset_token = jwt.encode({
            "sub": user_doc["id"],
            "type": "password_reset",
            "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=1),
            "iat": datetime.datetime.utcnow(),
        }, secret, algorithm="HS256")

        # Send email (best effort)
        try:
            from app.services.email_service import EmailService
            reset_link = f"{settings.frontend_url}/reset-password/{reset_token}"
            EmailService.send_contact_email(
                name=user_doc.get("first_name", ""),
                user_email=user_doc["email"],
                subject="Password Reset Request",
                message=f"Click this link to reset your password:\n\n{reset_link}\n\nThis link expires in 1 hour.",
                type="password_reset"
            )
        except Exception as e:
            print(f"Failed to send reset email: {e}")

    return {"message": "If an account with that email exists, a reset link has been sent."}


@router.post("/reset-password/{token}")
async def reset_password(token: str, body: ResetPasswordRequest):
    """Reset password using a valid reset token."""
    from app_fastapi import get_db
    db = get_db()

    # Validate password strength
    valid, error = _validate_password(body.password)
    if not valid:
        raise HTTPException(status_code=400, detail=error)

    try:
        secret = settings.jwt_secret_key or settings.secret_key
        payload = jwt.decode(token, secret, algorithms=["HS256"])

        if payload.get("type") != "password_reset":
            raise HTTPException(status_code=400, detail="Invalid reset token")

        user_doc = await db.users.find_one({"id": payload["sub"]})
        if not user_doc:
            raise HTTPException(status_code=400, detail="Invalid reset token")

        # Hash new password
        import bcrypt
        new_hash = await asyncio.to_thread(
            bcrypt.hashpw, body.password.encode("utf-8"), bcrypt.gensalt(rounds=12)
        )
        await db.users.update_one(
            {"_id": user_doc["_id"]},
            {"$set": {"password_hash": new_hash.decode("utf-8")}}
        )

        return {"message": "Password reset successfully. You can now log in."}

    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=400, detail="Reset link has expired. Please request a new one.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=400, detail="Invalid reset token")
