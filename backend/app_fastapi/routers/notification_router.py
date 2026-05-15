"""
Notification Router — FastAPI migration of app/routes/notification_routes.py

Endpoints:
    GET /api/notifications/          — Get notifications
    PUT /api/notifications/read      — Mark all as read
    PUT /api/notifications/{id}/read — Mark one as read
"""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse

from app_fastapi.dependencies import get_current_user

router = APIRouter()


def _s(data=None, message="Success"):
    return JSONResponse(content={"status": "success", "message": message, "data": data})

def _notif_dict(doc):
    d = {k: v for k, v in doc.items() if k != "_id"}
    if isinstance(d.get("created_at"), datetime): d["created_at"] = d["created_at"].isoformat()
    return d


@router.get("/")
async def get_notifications(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    unread: str = Query("false"),
    current_user: dict = Depends(get_current_user),
):
    from app_fastapi import get_db
    db = get_db()
    uid = current_user["id"]

    query = {"user_id": uid}
    if unread.lower() == "true":
        query["is_read"] = False

    total = await db.notifications.count_documents(query)
    skip = (page - 1) * per_page
    cursor = db.notifications.find(query).sort("created_at", -1).skip(skip).limit(per_page)
    items = [_notif_dict(doc) async for doc in cursor]

    unread_count = await db.notifications.count_documents({"user_id": uid, "is_read": False})

    return _s(data={"notifications": items, "unread_count": unread_count, "total": total})


@router.put("/read")
async def mark_all_read(current_user: dict = Depends(get_current_user)):
    from app_fastapi import get_db
    db = get_db()
    await db.notifications.update_many(
        {"user_id": current_user["id"], "is_read": False},
        {"$set": {"is_read": True}},
    )
    return _s(message="All notifications marked as read")


@router.put("/{notification_id}/read")
async def mark_one_read(notification_id: int, current_user: dict = Depends(get_current_user)):
    from app_fastapi import get_db
    db = get_db()
    notif = await db.notifications.find_one({"id": notification_id})
    if not notif or notif.get("user_id") != current_user["id"]:
        return JSONResponse(content={"status": "error", "message": "Notification not found"}, status_code=404)
    await db.notifications.update_one({"_id": notif["_id"]}, {"$set": {"is_read": True}})
    return _s(message="Notification marked as read")
