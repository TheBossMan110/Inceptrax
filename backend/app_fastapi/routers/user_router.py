"""
User Router — FastAPI migration of app/routes/user_routes.py

Endpoints:
    GET    /api/users/stats          — Dashboard stats
    GET    /api/users/profile        — Get user profile
    PUT    /api/users/profile        — Update user profile
    PUT    /api/users/reset-password — Change password (authenticated)
    DELETE /api/users/delete-account — Delete user account
"""

import asyncio
import datetime
from fastapi import APIRouter, Depends, HTTPException

from app_fastapi.dependencies import get_current_user
from app_fastapi.schemas import UpdateProfileRequest, ChangePasswordRequest

router = APIRouter()


def _user_to_dict(user_doc: dict) -> dict:
    """Convert a MongoDB user document to a frontend-safe dict."""
    return {
        "id": user_doc.get("id"),
        "first_name": user_doc.get("first_name", ""),
        "last_name": user_doc.get("last_name", ""),
        "email": user_doc.get("email", ""),
        "is_admin": user_doc.get("is_admin", False),
        "api_credits_used": user_doc.get("api_credits_used", 0),
        "created_at": user_doc["created_at"].isoformat() if isinstance(user_doc.get("created_at"), datetime.datetime) else str(user_doc.get("created_at", "")),
        "is_discoverable": user_doc.get("is_discoverable", False),
        "bio": user_doc.get("bio"),
        "skills": user_doc.get("skills"),
        "looking_for": user_doc.get("looking_for"),
        "linkedin_url": user_doc.get("linkedin_url"),
    }


@router.get("/stats")
async def get_stats(current_user: dict = Depends(get_current_user)):
    """Get dashboard stats for the current user."""
    from app_fastapi import get_db
    db = get_db()

    user_id = current_user["id"]

    # Count total ideas
    total_ideas = await db.ideas.count_documents({"user_id": user_id})

    # Calculate avg validation score
    cursor = db.ideas.find({"user_id": user_id})
    scores = []
    async for idea in cursor:
        analysis_data = idea.get("analysis_data")
        if isinstance(analysis_data, dict):
            score = analysis_data.get("overall_score", 0)
            if score and score > 0:
                scores.append(score)

    avg_score = round(sum(scores) / len(scores), 1) if scores else 0

    # Count completed reports
    reports_count = await db.ideas.count_documents({"user_id": user_id, "status": "completed"})

    stats = [
        {"name": "Ideas Created", "value": str(total_ideas)},
        {"name": "Avg. Validation Score", "value": f"{avg_score}%"},
        {"name": "Reports Generated", "value": str(reports_count)},
    ]

    return {
        "status": "success",
        "message": "Success",
        "data": {"stats": stats},
    }


@router.get("/profile")
async def get_profile(current_user: dict = Depends(get_current_user)):
    """Get the current user's profile."""
    return {
        "status": "success",
        "message": "Success",
        "data": {"user": _user_to_dict(current_user)},
    }


@router.put("/profile")
async def update_profile(
    body: UpdateProfileRequest,
    current_user: dict = Depends(get_current_user),
):
    """Update the current user's profile."""
    from app_fastapi import get_db
    db = get_db()

    update_fields = {}
    if body.first_name is not None:
        update_fields["first_name"] = body.first_name
    if body.last_name is not None:
        update_fields["last_name"] = body.last_name
    if body.email is not None:
        update_fields["email"] = body.email

    if update_fields:
        await db.users.update_one(
            {"_id": current_user["_id"]},
            {"$set": update_fields},
        )

    # Fetch updated user
    updated_user = await db.users.find_one({"_id": current_user["_id"]})

    return {
        "status": "success",
        "message": "Profile updated successfully",
        "data": {"user": _user_to_dict(updated_user)},
    }


@router.put("/reset-password")
async def reset_password(
    body: ChangePasswordRequest,
    current_user: dict = Depends(get_current_user),
):
    """Change password for the authenticated user."""
    from app_fastapi import get_db
    db = get_db()

    import bcrypt
    new_hash = await asyncio.to_thread(
        bcrypt.hashpw, body.new_password.encode("utf-8"), bcrypt.gensalt(rounds=12)
    )

    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$set": {"password_hash": new_hash.decode("utf-8")}},
    )

    return {
        "status": "success",
        "message": "Password reset successful",
        "data": None,
    }


@router.delete("/delete-account")
async def delete_account(current_user: dict = Depends(get_current_user)):
    """Delete the current user's account and all their ideas."""
    from app_fastapi import get_db
    db = get_db()

    user_id = current_user["id"]

    # Delete all user's ideas
    await db.ideas.delete_many({"user_id": user_id})

    # Delete user
    await db.users.delete_one({"_id": current_user["_id"]})

    return {
        "status": "success",
        "message": "Account deleted successfully",
        "data": None,
    }
