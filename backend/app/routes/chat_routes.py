from flask import Blueprint, request, jsonify
from app.models.user_model import Message, User, BlockedUser, Notification
from app.middleware.auth_middleware import token_required
from app import limiter

chat_bp = Blueprint('chat', __name__)


@chat_bp.route('/conversations', methods=['GET'])
@limiter.limit("120/minute")
@token_required
def get_conversations(current_user):
    """Get list of all conversations (unique users you've chatted with)."""
    partner_ids = Message.find_user_conversations(current_user.id)

    conversations = []
    for partner_id in partner_ids:
        partner = User.find_by_id(partner_id)
        if not partner:
            continue

        last_msg = Message.get_last_message(current_user.id, partner_id)
        unread_count = Message.count_unread(current_user.id, sender_id=partner_id)

        conversations.append({
            "partner_id": partner.id,
            "partner_name": f"{partner.first_name} {partner.last_name or ''}".strip(),
            "partner_initial": (partner.first_name[0].upper() if partner.first_name else "?"),
            "last_message": last_msg.content[:80] if last_msg else "",
            "last_message_time": last_msg.created_at.isoformat() if last_msg and hasattr(last_msg.created_at, 'isoformat') else None,
            "last_message_is_mine": (last_msg.sender_id == current_user.id) if last_msg else False,
            "unread_count": unread_count,
        })

    conversations.sort(key=lambda c: c["last_message_time"] or "", reverse=True)

    return jsonify({"conversations": conversations}), 200


@chat_bp.route('/messages/<int:partner_id>', methods=['GET'])
@token_required
def get_messages(current_user, partner_id):
    """Get all messages between current user and a specific partner."""
    partner = User.find_by_id(partner_id)
    if not partner:
        return jsonify({"error": "User not found"}), 404

    # Check if blocked
    if BlockedUser.is_blocked_either_way(current_user.id, partner_id):
        return jsonify({"error": "This conversation is not available"}), 403

    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)

    result = Message.find_between_users(
        current_user.id, partner_id, sort_asc=True, page=page, per_page=per_page
    )
    items, total, pages = result

    # Mark unread messages from partner as read
    Message.mark_as_read(sender_id=partner_id, receiver_id=current_user.id)

    return jsonify({
        "messages": [m.to_dict() for m in items],
        "partner": {
            "id": partner.id,
            "name": f"{partner.first_name} {partner.last_name or ''}".strip(),
            "initial": partner.first_name[0].upper() if partner.first_name else "?",
        },
        "total": total,
        "pages": pages,
        "current_page": page,
    }), 200


@chat_bp.route('/messages/<int:partner_id>', methods=['POST'])
@token_required
def send_message(current_user, partner_id):
    """Send a message to another user."""
    if partner_id == current_user.id:
        return jsonify({"error": "Cannot message yourself"}), 400

    partner = User.find_by_id(partner_id)
    if not partner:
        return jsonify({"error": "User not found"}), 404

    # Check if blocked
    if BlockedUser.is_blocked_either_way(current_user.id, partner_id):
        return jsonify({"error": "Cannot send message to this user"}), 403

    data = request.get_json()
    content = data.get('content', '').strip() if data else ''
    if not content:
        return jsonify({"error": "Message cannot be empty"}), 400
    if len(content) > 2000:
        return jsonify({"error": "Message too long (max 2000 chars)"}), 400

    message = Message(
        sender_id=current_user.id,
        receiver_id=partner_id,
        content=content,
    )
    message.save()

    # Try to create a notification (non-blocking)
    try:
        notif = Notification(
            user_id=partner_id,
            type="chat",
            message=f"New message from {current_user.first_name}",
            link=f"/dashboard/chat?with={current_user.id}",
        )
        notif.save()
    except Exception:
        pass  # Notification is nice-to-have, don't fail the message

    return jsonify({"message": message.to_dict()}), 201


@chat_bp.route('/unread-count', methods=['GET'])
@limiter.limit("120/minute")
@token_required
def get_unread_count(current_user):
    """Get total unread message count for the current user."""
    count = Message.count_unread(current_user.id)
    return jsonify({"unread_count": count}), 200
