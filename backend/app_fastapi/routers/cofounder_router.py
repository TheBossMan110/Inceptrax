"""
Cofounder Router — FastAPI migration of app/routes/cofounder_routes.py

Endpoints:
    GET  /api/cofounder/profiles            — Browse discoverable profiles
    GET  /api/cofounder/profile/me          — Get my cofounder profile
    PUT  /api/cofounder/profile             — Update cofounder profile
    GET  /api/cofounder/conversations       — List conversations
    GET  /api/cofounder/messages/{user_id}  — Get messages
    POST /api/cofounder/messages/{user_id}  — Send message
    PUT  /api/cofounder/messages/{user_id}/read — Mark read
    POST /api/cofounder/block/{user_id}     — Block user
    POST /api/cofounder/unblock/{user_id}   — Unblock user
    POST /api/cofounder/report/{user_id}    — Report user
"""

from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from app_fastapi.dependencies import get_current_user

router = APIRouter()


def _s(data=None, message="Success"):
    return JSONResponse(content={"status": "success", "message": message, "data": data})

def _e(message="Error", status=400):
    return JSONResponse(content={"status": "error", "message": message}, status_code=status)

def _msg_dict(doc):
    d = {k: v for k, v in doc.items() if k != "_id"}
    if isinstance(d.get("created_at"), datetime): d["created_at"] = d["created_at"].isoformat()
    return d


class UpdateCofounderProfile(BaseModel):
    is_discoverable: Optional[bool] = None
    bio: Optional[str] = None
    skills: Optional[str] = None
    looking_for: Optional[str] = None
    linkedin_url: Optional[str] = None

class MessageRequest(BaseModel):
    content: str = Field(min_length=1, max_length=2000)

class ReportRequest(BaseModel):
    reason: str = Field(min_length=10, max_length=500)


@router.get("/profiles")
async def get_profiles(skills: str = "", current_user: dict = Depends(get_current_user)):
    from app_fastapi import get_db
    db = get_db()
    uid = current_user["id"]

    blocked_ids = await db.blocked_users.distinct("blocked_id", {"blocker_id": uid})
    blocked_by = await db.blocked_users.distinct("blocker_id", {"blocked_id": uid})
    exclude = set(blocked_ids + blocked_by + [uid])

    query = {"is_discoverable": True, "id": {"$nin": list(exclude)}}
    if skills:
        query["skills"] = {"$regex": skills, "$options": "i"}

    profiles = []
    async for doc in db.users.find(query):
        profiles.append({
            "id": doc["id"], "first_name": doc.get("first_name", ""),
            "last_name": doc.get("last_name", ""), "bio": doc.get("bio"),
            "skills": doc.get("skills"), "looking_for": doc.get("looking_for"),
            "linkedin_url": doc.get("linkedin_url"),
            "joined": doc["created_at"].isoformat() if isinstance(doc.get("created_at"), datetime) else str(doc.get("created_at", "")),
        })

    return _s(data={"profiles": profiles})


@router.get("/profile/me")
async def get_my_profile(current_user: dict = Depends(get_current_user)):
    return _s(data={
        "is_discoverable": current_user.get("is_discoverable", False),
        "bio": current_user.get("bio"), "skills": current_user.get("skills"),
        "looking_for": current_user.get("looking_for"), "linkedin_url": current_user.get("linkedin_url"),
    })


@router.put("/profile")
async def update_profile(body: UpdateCofounderProfile, current_user: dict = Depends(get_current_user)):
    from app_fastapi import get_db
    db = get_db()
    update = {}
    if body.is_discoverable is not None: update["is_discoverable"] = body.is_discoverable
    if body.bio is not None: update["bio"] = body.bio
    if body.skills is not None: update["skills"] = body.skills
    if body.looking_for is not None: update["looking_for"] = body.looking_for
    if body.linkedin_url is not None: update["linkedin_url"] = body.linkedin_url
    if update:
        await db.users.update_one({"_id": current_user["_id"]}, {"$set": update})
    return _s(message="Profile updated successfully")


@router.get("/conversations")
async def get_conversations(current_user: dict = Depends(get_current_user)):
    from app_fastapi import get_db
    db = get_db()
    uid = current_user["id"]

    sent = await db.messages.distinct("receiver_id", {"sender_id": uid})
    received = await db.messages.distinct("sender_id", {"receiver_id": uid})
    partner_ids = list(set(sent + received))

    convos = []
    for pid in partner_ids:
        partner = await db.users.find_one({"id": pid})
        if not partner: continue
        last_msg = await db.messages.find_one(
            {"$or": [{"sender_id": uid, "receiver_id": pid}, {"sender_id": pid, "receiver_id": uid}]},
            sort=[("created_at", -1)],
        )
        unread = await db.messages.count_documents({"sender_id": pid, "receiver_id": uid, "is_read": False})
        convos.append({
            "user": {"id": partner["id"], "first_name": partner.get("first_name", ""), "last_name": partner.get("last_name", "")},
            "last_message": _msg_dict(last_msg) if last_msg else None,
            "unread_count": unread,
        })

    convos.sort(key=lambda c: c["last_message"]["created_at"] if c["last_message"] else "", reverse=True)
    return _s(data={"conversations": convos})


@router.get("/messages/{user_id}")
async def get_messages(user_id: int, current_user: dict = Depends(get_current_user)):
    from app_fastapi import get_db
    db = get_db()
    uid = current_user["id"]
    query = {"$or": [{"sender_id": uid, "receiver_id": user_id}, {"sender_id": user_id, "receiver_id": uid}]}
    messages = [_msg_dict(doc) async for doc in db.messages.find(query).sort("created_at", 1)]
    return _s(data={"messages": messages})


@router.post("/messages/{user_id}")
async def send_message(user_id: int, body: MessageRequest, current_user: dict = Depends(get_current_user)):
    from app_fastapi import get_db
    db = get_db()

    receiver = await db.users.find_one({"id": user_id})
    if not receiver: return _e("User not found", 404)

    counter = await db.counters.find_one_and_update(
        {"_id": "messages"}, {"$inc": {"seq": 1}}, upsert=True, return_document=True,
    )
    msg = {"id": counter["seq"], "sender_id": current_user["id"], "receiver_id": user_id,
           "content": body.content.strip(), "is_read": False, "created_at": datetime.utcnow()}
    await db.messages.insert_one(msg)
    return _s(data={"message": _msg_dict(msg)})


@router.put("/messages/{user_id}/read")
async def mark_read(user_id: int, current_user: dict = Depends(get_current_user)):
    from app_fastapi import get_db
    db = get_db()
    await db.messages.update_many(
        {"sender_id": user_id, "receiver_id": current_user["id"], "is_read": False},
        {"$set": {"is_read": True}},
    )
    return _s(message="Messages marked as read")


@router.post("/block/{user_id}")
async def block_user(user_id: int, current_user: dict = Depends(get_current_user)):
    from app_fastapi import get_db
    db = get_db()
    uid = current_user["id"]
    if user_id == uid: return _e("Cannot block yourself")
    existing = await db.blocked_users.find_one({"blocker_id": uid, "blocked_id": user_id})
    if existing: return _e("User already blocked")
    counter = await db.counters.find_one_and_update(
        {"_id": "blocked_users"}, {"$inc": {"seq": 1}}, upsert=True, return_document=True,
    )
    await db.blocked_users.insert_one({"id": counter["seq"], "blocker_id": uid, "blocked_id": user_id, "created_at": datetime.utcnow()})
    return _s(message="User blocked successfully")


@router.post("/unblock/{user_id}")
async def unblock_user(user_id: int, current_user: dict = Depends(get_current_user)):
    from app_fastapi import get_db
    db = get_db()
    block = await db.blocked_users.find_one({"blocker_id": current_user["id"], "blocked_id": user_id})
    if not block: return _e("User is not blocked")
    await db.blocked_users.delete_one({"_id": block["_id"]})
    return _s(message="User unblocked")


@router.post("/report/{user_id}")
async def report_user(user_id: int, body: ReportRequest, current_user: dict = Depends(get_current_user)):
    from app_fastapi import get_db
    db = get_db()
    if user_id == current_user["id"]: return _e("Cannot report yourself")
    counter = await db.counters.find_one_and_update(
        {"_id": "user_reports"}, {"$inc": {"seq": 1}}, upsert=True, return_document=True,
    )
    await db.user_reports.insert_one({
        "id": counter["seq"], "reporter_id": current_user["id"],
        "reported_id": user_id, "reason": body.reason[:500], "created_at": datetime.utcnow(),
    })
    return _s(message="Report submitted. Our team will review it within 24 hours.")
