"""
FastAPI dependencies for authentication.

Replaces Flask's @token_required and @admin_required decorators
with FastAPI's Depends() system.

Usage:
    @router.get("/protected")
    async def protected_route(current_user: dict = Depends(get_current_user)):
        ...

    @router.get("/admin-only")
    async def admin_route(current_user: dict = Depends(get_admin_user)):
        ...
"""

import jwt
from fastapi import Depends, HTTPException, Request, Cookie
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional

from app_fastapi.config import settings


# Optional bearer token — doesn't raise if missing (we check cookies too)
optional_bearer = HTTPBearer(auto_error=False)


async def get_current_user(
    request: Request,
    access_token: Optional[str] = Cookie(None),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(optional_bearer),
) -> dict:
    """
    Extract and validate JWT from:
    1. httpOnly cookie (primary — set by backend on login)
    2. Authorization: Bearer header (fallback — for API testing / mobile)

    Returns the user document as a dict.
    Raises HTTPException 401 if auth fails.
    """
    from app_fastapi import get_db

    # 1. Try cookie first
    token = access_token

    # 2. Fall back to Authorization header
    if not token and credentials:
        token = credentials.credentials

    if not token:
        raise HTTPException(status_code=401, detail="Authentication required")

    # Check blacklist
    db = get_db()
    blacklisted = await db.token_blacklist.find_one({"token": token})
    if blacklisted:
        raise HTTPException(status_code=401, detail="Token has been revoked")

    # Decode JWT
    try:
        secret = settings.jwt_secret_key or settings.secret_key
        payload = jwt.decode(token, secret, algorithms=["HS256"])
        user_id = payload["sub"]
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired. Please log in again.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token. Please log in again.")

    # Fetch user from DB
    user_doc = await db.users.find_one({"id": user_id})
    if not user_doc:
        raise HTTPException(status_code=401, detail="User not found")

    return user_doc


async def get_admin_user(current_user: dict = Depends(get_current_user)) -> dict:
    """
    Dependency that ensures the current user is an admin.
    Must be used instead of (not alongside) get_current_user.
    """
    if not current_user.get("is_admin", False):
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user
