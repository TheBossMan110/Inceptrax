"""
Admin Router — FastAPI migration of app/routes/admin_routes.py

Endpoints:
    GET   /api/admin/stats                   — Dashboard stats
    GET   /api/admin/users                   — List all users
    POST  /api/admin/track-visit             — Track visitor (public)
    PATCH /api/admin/users/{user_id}/role    — Update user role
    GET   /api/admin/backup                  — Download DB backup
    POST  /api/admin/restore                 — Restore DB from backup
"""

import os
import json
import tempfile
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

from app_fastapi.config import settings
from app_fastapi.dependencies import get_admin_user

router = APIRouter()


class UpdateRoleRequest(BaseModel):
    is_admin: bool


@router.get("/stats")
async def get_admin_stats(current_user: dict = Depends(get_admin_user)):
    from app_fastapi import get_db
    db = get_db()

    total_users = await db.users.count_documents({})
    total_ideas = await db.ideas.count_documents({})

    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    signups_today = await db.users.count_documents({"created_at": {"$gte": today}})

    # Visitors
    stats_doc = await db.system_stats.find_one({"_id": "global"})
    total_visitors = stats_doc.get("total_visitors", 0) if stats_doc else 0

    # Total API credits
    pipeline = [{"$group": {"_id": None, "total": {"$sum": "$api_credits_used"}}}]
    result = await db.users.aggregate(pipeline).to_list(1)
    total_api_used = result[0]["total"] if result else 0

    return {
        "total_users": total_users, "total_ideas": total_ideas,
        "signups_today": signups_today, "total_visitors": total_visitors,
        "api_usage": {"used": total_api_used, "remaining": "unlimited", "total_budget": "unlimited"},
    }


@router.get("/users")
async def get_all_users(current_user: dict = Depends(get_admin_user)):
    from app_fastapi import get_db
    db = get_db()
    users = []
    async for doc in db.users.find().sort("created_at", -1):
        d = {k: v for k, v in doc.items() if k not in ("_id", "password_hash")}
        if isinstance(d.get("created_at"), datetime): d["created_at"] = d["created_at"].isoformat()
        users.append(d)
    return {"users": users}


@router.post("/track-visit")
async def track_visit():
    """Public route to increment visitor counter."""
    from app_fastapi import get_db
    db = get_db()
    await db.system_stats.update_one({"_id": "global"}, {"$inc": {"total_visitors": 1}}, upsert=True)
    return {"message": "Visit tracked"}


@router.patch("/users/{user_id}/role")
async def update_user_role(user_id: int, body: UpdateRoleRequest, current_user: dict = Depends(get_admin_user)):
    from app_fastapi import get_db
    db = get_db()

    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Prevent main admin demotion
    if user.get("email") == settings.admin_email and not body.is_admin:
        raise HTTPException(status_code=403, detail="Main admin account cannot be demoted")

    await db.users.update_one({"_id": user["_id"]}, {"$set": {"is_admin": body.is_admin}})
    user["is_admin"] = body.is_admin

    d = {k: v for k, v in user.items() if k not in ("_id", "password_hash")}
    if isinstance(d.get("created_at"), datetime): d["created_at"] = d["created_at"].isoformat()

    return {"message": f"User role updated to {'Admin' if body.is_admin else 'User'}", "user": d}


@router.get("/backup")
async def backup_database(current_user: dict = Depends(get_admin_user)):
    """Export a JSON backup of the entire database."""
    from app_fastapi import get_db
    db = get_db()

    backup_data = {}
    collections = await db.list_collection_names()
    for coll_name in collections:
        docs = await db[coll_name].find().to_list(None)
        for doc in docs:
            doc["_id"] = str(doc["_id"])
            for key, val in doc.items():
                if isinstance(val, datetime):
                    doc[key] = val.isoformat()
        backup_data[coll_name] = docs

    date_str = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    backup_path = os.path.join(tempfile.gettempdir(), f"inceptrax_backup_{date_str}.json")
    with open(backup_path, "w") as f:
        json.dump(backup_data, f, indent=2, default=str)

    return FileResponse(
        path=backup_path,
        filename=f"inceptrax_backup_{date_str}.json",
        media_type="application/json",
    )


@router.post("/restore")
async def restore_database(file: UploadFile = File(...), current_user: dict = Depends(get_admin_user)):
    """Restore database from a JSON backup file."""
    from app_fastapi import get_db
    db = get_db()

    if not file.filename or not file.filename.endswith(".json"):
        raise HTTPException(status_code=400, detail="Only .json backup files are accepted")

    try:
        content = await file.read()
        backup_data = json.loads(content)

        for coll_name, docs in backup_data.items():
            if coll_name.startswith("system."):
                continue
            await db[coll_name].drop()
            if docs:
                for doc in docs:
                    doc.pop("_id", None)
                await db[coll_name].insert_many(docs)

        return {"message": "Database restored successfully from JSON backup"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
