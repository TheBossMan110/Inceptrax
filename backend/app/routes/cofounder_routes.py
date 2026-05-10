from flask import Blueprint, request
from app.models.user_model import User, Message, BlockedUser, UserReport, Notification
from app.middleware.auth_middleware import token_required
from app.utils.response_formatter import ResponseFormatter
from datetime import datetime

cofounder_bp = Blueprint('cofounder', __name__)

@cofounder_bp.route('/profiles', methods=['GET'])
@token_required
def get_profiles(current_user):
    skills_query = request.args.get('skills', '').lower()

    blocked_ids = BlockedUser.get_blocked_ids(current_user.id)
    blocked_by_ids = BlockedUser.get_blocked_by_ids(current_user.id)
    exclude_ids = set(blocked_ids + blocked_by_ids + [current_user.id])

    # Query discoverable users excluding blocked
    coll = User.get_collection()
    query = {"is_discoverable": True, "id": {"$nin": list(exclude_ids)}}
    if skills_query:
        query["skills"] = {"$regex": skills_query, "$options": "i"}
    
    docs = coll.find(query)
    users = [User(doc) for doc in docs]
    
    profiles = [user.to_public_profile_dict() for user in users]
    return ResponseFormatter.success(data={"profiles": profiles})

@cofounder_bp.route('/profile/me', methods=['GET'])
@token_required
def get_my_profile(current_user):
    return ResponseFormatter.success(data={
        "is_discoverable": current_user.is_discoverable,
        "bio": current_user.bio,
        "skills": current_user.skills,
        "looking_for": current_user.looking_for,
        "linkedin_url": current_user.linkedin_url
    })

@cofounder_bp.route('/profile', methods=['PUT'])
@token_required
def update_profile(current_user):
    data = request.get_json()
    
    if 'is_discoverable' in data:
        current_user.is_discoverable = data['is_discoverable']
    if 'bio' in data:
        current_user.bio = data['bio']
    if 'skills' in data:
        current_user.skills = data['skills']
    if 'looking_for' in data:
        current_user.looking_for = data['looking_for']
    if 'linkedin_url' in data:
        current_user.linkedin_url = data['linkedin_url']
        
    current_user.save()
    return ResponseFormatter.success(message="Profile updated successfully")

@cofounder_bp.route('/conversations', methods=['GET'])
@token_required
def get_conversations(current_user):
    partner_ids = Message.find_user_conversations(current_user.id)
    
    conversations = {}
    for partner_id in partner_ids:
        partner = User.find_by_id(partner_id)
        if not partner:
            continue
        
        last_msg = Message.get_last_message(current_user.id, partner_id)
        unread = Message.count_unread(current_user.id, sender_id=partner_id)
        
        conversations[partner_id] = {
            "user": {
                "id": partner.id,
                "first_name": partner.first_name,
                "last_name": partner.last_name
            },
            "last_message": last_msg.to_dict() if last_msg else None,
            "unread_count": unread
        }
    
    sorted_convos = sorted(
        list(conversations.values()),
        key=lambda x: x["last_message"]["created_at"] if x["last_message"] else "",
        reverse=True
    )
    
    return ResponseFormatter.success(data={"conversations": sorted_convos})

@cofounder_bp.route('/messages/<int:user_id>', methods=['GET'])
@token_required
def get_messages(current_user, user_id):
    messages = Message.find_between_users(current_user.id, user_id, sort_asc=True)
    return ResponseFormatter.success(data={"messages": [msg.to_dict() for msg in messages]})

@cofounder_bp.route('/messages/<int:user_id>', methods=['POST'])
@token_required
def send_message(current_user, user_id):
    data = request.get_json()
    content = data.get('content')
    
    if not content:
        return ResponseFormatter.error("Content is required", 400)
    
    receiver = User.find_by_id(user_id)
    if not receiver:
        return ResponseFormatter.error("User not found", 404)
        
    msg = Message(
        sender_id=current_user.id,
        receiver_id=user_id,
        content=content
    )
    msg.save()
    
    return ResponseFormatter.success(data={"message": msg.to_dict()})

@cofounder_bp.route('/messages/<int:user_id>/read', methods=['PUT'])
@token_required
def mark_read(current_user, user_id):
    Message.mark_as_read(sender_id=user_id, receiver_id=current_user.id)
    return ResponseFormatter.success(message="Messages marked as read")


@cofounder_bp.route('/block/<int:user_id>', methods=['POST'])
@token_required
def block_user(current_user, user_id):
    """Block a user — they won't appear in profiles or be able to message you."""
    if user_id == current_user.id:
        return ResponseFormatter.error("Cannot block yourself")

    existing = BlockedUser.find_block(current_user.id, user_id)
    if existing:
        return ResponseFormatter.error("User already blocked")

    block = BlockedUser(blocker_id=current_user.id, blocked_id=user_id)
    block.save()

    return ResponseFormatter.success(message="User blocked successfully")


@cofounder_bp.route('/unblock/<int:user_id>', methods=['POST'])
@token_required
def unblock_user(current_user, user_id):
    """Unblock a previously blocked user."""
    block = BlockedUser.find_block(current_user.id, user_id)
    if not block:
        return ResponseFormatter.error("User is not blocked")

    block.delete()
    return ResponseFormatter.success(message="User unblocked")


@cofounder_bp.route('/report/<int:user_id>', methods=['POST'])
@token_required
def report_user(current_user, user_id):
    """Report a user for inappropriate behavior."""
    if user_id == current_user.id:
        return ResponseFormatter.error("Cannot report yourself")

    data = request.get_json(silent=True) or {}
    reason = data.get('reason', '').strip()

    if not reason or len(reason) < 10:
        return ResponseFormatter.error("Please provide a reason (at least 10 characters)")

    report = UserReport(
        reporter_id=current_user.id,
        reported_id=user_id,
        reason=reason[:500]
    )
    report.save()

    return ResponseFormatter.success(message="Report submitted. Our team will review it within 24 hours.")
