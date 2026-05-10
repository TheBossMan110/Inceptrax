from flask import Blueprint, request
from app.models.user_model import User, Idea
from app.middleware.auth_middleware import token_required
from app.utils.response_formatter import ResponseFormatter

user_bp = Blueprint('user', __name__)

# ------------------ DASHBOARD STATS ------------------
@user_bp.route('/stats', methods=['GET'])
@token_required
def get_stats(current_user):
    total_ideas = Idea.count_by_user(current_user.id)

    user_ideas = Idea.find_by_user(current_user.id)
    scores = [idea.validation_score for idea in user_ideas if idea.validation_score > 0]
    avg_score = round(sum(scores) / len(scores), 1) if scores else 0

    reports_count = Idea.count_by_user(current_user.id, status='completed')

    stats = [
        {"name": "Ideas Created", "value": str(total_ideas)},
        {"name": "Avg. Validation Score", "value": f"{avg_score}%"},
        {"name": "Reports Generated", "value": str(reports_count)},
    ]

    return ResponseFormatter.success(data={"stats": stats})


# ------------------ GET PROFILE ------------------
@user_bp.route('/profile', methods=['GET'])
@token_required
def get_profile(current_user):
    return ResponseFormatter.success(data={"user": current_user.to_dict()})


# ------------------ UPDATE PROFILE ------------------
@user_bp.route('/profile', methods=['PUT'])
@token_required
def update_profile(current_user):
    data = request.get_json()

    current_user.first_name = data.get("first_name", current_user.first_name)
    current_user.last_name = data.get("last_name", current_user.last_name)
    current_user.email = data.get("email", current_user.email)
    current_user.save()

    return ResponseFormatter.success(
        message="Profile updated successfully",
        data={"user": current_user.to_dict()}
    )


# ------------------ RESET PASSWORD ------------------
@user_bp.route('/reset-password', methods=['PUT'])
@token_required
def reset_password(current_user):
    data = request.get_json()

    if not data or not data.get("new_password"):
        return ResponseFormatter.error("New password required", 400)

    current_user.set_password(data["new_password"])
    current_user.save()

    return ResponseFormatter.success(message="Password reset successful")


# ------------------ DELETE ACCOUNT ------------------
@user_bp.route('/delete-account', methods=['DELETE'])
@token_required
def delete_account(current_user):
    Idea.delete_by_user(current_user.id)
    current_user.delete()

    return ResponseFormatter.success(message="Account deleted successfully")
