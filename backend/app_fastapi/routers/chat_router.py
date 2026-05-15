"""
Chat Router — FastAPI migration of app/routes/chat_routes.py

Endpoints:
    GET  /api/chat/conversations         — List all conversations
    GET  /api/chat/messages/{partner_id}  — Get messages with a user
    POST /api/chat/messages/{partner_id}  — Send a message
    GET  /api/chat/unread-count           — Total unread count
"""

from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from app_fastapi.dependencies import get_current_user

router = APIRouter()


class SendMessageRequest(BaseModel):
    content: str = Field(min_length=1, max_length=2000)


def _msg_to_dict(doc: dict) -> dict:
    d = {k: v for k, v in doc.items() if k != "_id"}
    if isinstance(d.get("created_at"), datetime):
        d["created_at"] = d["created_at"].isoformat()
    return d


@router.get("/conversations")
async def get_conversations(current_user: dict = Depends(get_current_user)):
    """Get list of all conversations."""
    from app_fastapi import get_db
    db = get_db()
    uid = current_user["id"]

    # Find all unique partner IDs
    sent = await db.messages.distinct("receiver_id", {"sender_id": uid})
    received = await db.messages.distinct("sender_id", {"receiver_id": uid})
    partner_ids = list(set(sent + received))

    conversations = []
    for pid in partner_ids:
        partner = await db.users.find_one({"id": pid})
        if not partner:
            continue

        last_msg = await db.messages.find_one(
            {"$or": [{"sender_id": uid, "receiver_id": pid}, {"sender_id": pid, "receiver_id": uid}]},
            sort=[("created_at", -1)],
        )
        unread = await db.messages.count_documents({"sender_id": pid, "receiver_id": uid, "is_read": False})

        conversations.append({
            "partner_id": partner["id"],
            "partner_name": f"{partner.get('first_name', '')} {partner.get('last_name', '')}".strip(),
            "partner_initial": partner.get("first_name", "?")[0].upper() if partner.get("first_name") else "?",
            "last_message": (last_msg.get("content", "") or "")[:80] if last_msg else "",
            "last_message_time": last_msg["created_at"].isoformat() if last_msg and isinstance(last_msg.get("created_at"), datetime) else None,
            "last_message_is_mine": (last_msg.get("sender_id") == uid) if last_msg else False,
            "unread_count": unread,
        })

    conversations.sort(key=lambda c: c["last_message_time"] or "", reverse=True)
    return {"conversations": conversations}


@router.get("/messages/{partner_id}")
async def get_messages(
    partner_id: int,
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    current_user: dict = Depends(get_current_user),
):
    """Get messages between current user and partner."""
    from app_fastapi import get_db
    db = get_db()
    uid = current_user["id"]

    partner = await db.users.find_one({"id": partner_id})
    if not partner:
        raise HTTPException(status_code=404, detail="User not found")

    # Check blocked
    blocked = await db.blocked_users.find_one({"$or": [
        {"blocker_id": uid, "blocked_id": partner_id},
        {"blocker_id": partner_id, "blocked_id": uid},
    ]})
    if blocked:
        raise HTTPException(status_code=403, detail="This conversation is not available")

    query = {"$or": [
        {"sender_id": uid, "receiver_id": partner_id},
        {"sender_id": partner_id, "receiver_id": uid},
    ]}
    total = await db.messages.count_documents(query)
    skip = (page - 1) * per_page
    cursor = db.messages.find(query).sort("created_at", 1).skip(skip).limit(per_page)
    messages = [_msg_to_dict(doc) async for doc in cursor]
    pages = (total + per_page - 1) // per_page if per_page > 0 else 1

    # Mark unread as read
    await db.messages.update_many(
        {"sender_id": partner_id, "receiver_id": uid, "is_read": False},
        {"$set": {"is_read": True}},
    )

    return {
        "messages": messages,
        "partner": {
            "id": partner["id"],
            "name": f"{partner.get('first_name', '')} {partner.get('last_name', '')}".strip(),
            "initial": partner.get("first_name", "?")[0].upper() if partner.get("first_name") else "?",
        },
        "total": total, "pages": pages, "current_page": page,
    }


@router.post("/messages/{partner_id}", status_code=201)
async def send_message(partner_id: int, body: SendMessageRequest, current_user: dict = Depends(get_current_user)):
    """Send a message to another user."""
    from app_fastapi import get_db
    db = get_db()
    uid = current_user["id"]

    if partner_id == uid:
        raise HTTPException(status_code=400, detail="Cannot message yourself")

    partner = await db.users.find_one({"id": partner_id})
    if not partner:
        raise HTTPException(status_code=404, detail="User not found")

    blocked = await db.blocked_users.find_one({"$or": [
        {"blocker_id": uid, "blocked_id": partner_id},
        {"blocker_id": partner_id, "blocked_id": uid},
    ]})
    if blocked:
        raise HTTPException(status_code=403, detail="Cannot send message to this user")

    # Get next ID
    counter = await db.counters.find_one_and_update(
        {"_id": "messages"}, {"$inc": {"seq": 1}}, upsert=True, return_document=True,
    )
    msg_doc = {
        "id": counter["seq"],
        "sender_id": uid, "receiver_id": partner_id,
        "content": body.content.strip(),
        "is_read": False, "created_at": datetime.utcnow(),
    }
    await db.messages.insert_one(msg_doc)

    # Create notification (best effort)
    try:
        nc = await db.counters.find_one_and_update(
            {"_id": "notifications"}, {"$inc": {"seq": 1}}, upsert=True, return_document=True,
        )
        await db.notifications.insert_one({
            "id": nc["seq"], "user_id": partner_id, "type": "chat",
            "title": "", "message": f"New message from {current_user.get('first_name', '')}",
            "link": f"/dashboard/chat?with={uid}", "is_read": False, "created_at": datetime.utcnow(),
        })
    except Exception:
        pass

    return {"message": _msg_to_dict(msg_doc)}


@router.get("/unread-count")
async def get_unread_count(current_user: dict = Depends(get_current_user)):
    from app_fastapi import get_db
    db = get_db()
    count = await db.messages.count_documents({"receiver_id": current_user["id"], "is_read": False})
    return {"unread_count": count}
