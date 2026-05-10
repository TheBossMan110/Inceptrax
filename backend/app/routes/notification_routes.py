from flask import Blueprint, request
from app.middleware.auth_middleware import token_required
from app.utils.response_formatter import ResponseFormatter
from app.models.user_model import Notification
from app import limiter

notification_bp = Blueprint('notification', __name__)


@notification_bp.route('/', methods=['GET'])
@limiter.limit("120/minute")
@token_required
def get_notifications(current_user):
    """Get all notifications for the current user."""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    unread_only = request.args.get('unread', 'false').lower() == 'true'

    items, total, pages = Notification.find_by_user(
        current_user.id, unread_only=unread_only, page=page, per_page=per_page
    )

    unread_count = Notification.count_unread(current_user.id)

    return ResponseFormatter.success(data={
        "notifications": [n.to_dict() for n in items],
        "unread_count": unread_count,
        "total": total,
    })


@notification_bp.route('/read', methods=['PUT'])
@token_required
def mark_all_read(current_user):
    """Mark all notifications as read."""
    Notification.mark_all_read(current_user.id)
    return ResponseFormatter.success(message="All notifications marked as read")


@notification_bp.route('/<int:notification_id>/read', methods=['PUT'])
@token_required
def mark_one_read(current_user, notification_id):
    """Mark a single notification as read."""
    notif = Notification.find_by_id(notification_id)
    if not notif or notif.user_id != current_user.id:
        return ResponseFormatter.error("Notification not found", status=404)
    notif.is_read = True
    notif.save()
    return ResponseFormatter.success(message="Notification marked as read")
