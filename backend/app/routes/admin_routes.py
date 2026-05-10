from flask import Blueprint, jsonify, request, current_app
import os
import json
from app.models.user_model import User, Idea
from app.models.stats_model import SystemStats
from app.middleware.auth_middleware import token_required, admin_required
from app import get_db
from datetime import datetime, timedelta

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/stats', methods=['GET'])
@token_required
@admin_required
def get_admin_stats(current_user):
    db = get_db()
    total_users = db.users.count_documents({})
    total_ideas = db.ideas.count_documents({})
    
    # Signups today
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    signups_today = db.users.count_documents({"created_at": {"$gte": today}})
    
    # Visitors
    total_visitors = SystemStats.get_total_visitors()
    
    # Total API Credits used across all users
    pipeline = [{"$group": {"_id": None, "total": {"$sum": "$api_credits_used"}}}]
    result = list(db.users.aggregate(pipeline))
    total_api_used = result[0]["total"] if result else 0

    return jsonify({
        "total_users": total_users,
        "total_ideas": total_ideas,
        "signups_today": signups_today,
        "total_visitors": total_visitors,
        "api_usage": {
            "used": total_api_used,
            "remaining": "unlimited",
            "total_budget": "unlimited"
        }
    }), 200

@admin_bp.route('/users', methods=['GET'])
@token_required
@admin_required
def get_all_users(current_user):
    users = User.find_all(sort_by="created_at", descending=True)
    users_list = [user.to_dict() for user in users]
    return jsonify({"users": users_list}), 200

@admin_bp.route('/track-visit', methods=['POST'])
def track_visit():
    """Public route to increment visitor counter."""
    SystemStats.increment_visitors()
    return jsonify({"message": "Visit tracked"}), 200

@admin_bp.route('/users/<int:user_id>/role', methods=['PATCH'])
@token_required
@admin_required
def update_user_role(current_user, user_id):
    data = request.get_json()
    if not data or 'is_admin' not in data:
        return jsonify({"error": "Missing 'is_admin' field"}), 400
    
    user = User.find_by_id(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    # Prevent self-demotion of main admin
    if user.email == "hmzaakram295@gmail.com" and not data['is_admin']:
        return jsonify({"error": "Main admin account cannot be demoted"}), 403
    
    user.is_admin = data['is_admin']
    user.save()
    
    return jsonify({
        "message": f"User role updated to {'Admin' if user.is_admin else 'User'}",
        "user": user.to_dict()
    }), 200

@admin_bp.route('/backup', methods=['GET'])
@token_required
@admin_required
def backup_database(current_user):
    """Export a JSON backup of the entire MongoDB database."""
    db = get_db()
    
    backup_data = {}
    for collection_name in db.list_collection_names():
        docs = list(db[collection_name].find())
        # Convert ObjectId to string for JSON serialization
        for doc in docs:
            doc['_id'] = str(doc['_id'])
            for key, val in doc.items():
                if isinstance(val, datetime):
                    doc[key] = val.isoformat()
        backup_data[collection_name] = docs
    
    date_str = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
    
    # Write to temp file
    import tempfile
    backup_path = os.path.join(tempfile.gettempdir(), f"inceptrax_backup_{date_str}.json")
    with open(backup_path, 'w') as f:
        json.dump(backup_data, f, indent=2, default=str)
    
    from flask import send_file
    return send_file(
        backup_path,
        as_attachment=True,
        download_name=f"inceptrax_backup_{date_str}.json",
        mimetype='application/json'
    )

@admin_bp.route('/restore', methods=['POST'])
@token_required
@admin_required
def restore_database(current_user):
    """Restore database from a JSON backup file."""
    if 'file' not in request.files:
        return jsonify({"error": "No file parameter provided"}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
        
    if not file.filename.endswith('.json'):
        return jsonify({"error": "Only .json backup files are accepted"}), 400
        
    try:
        backup_data = json.loads(file.read())
        db = get_db()
        
        for collection_name, docs in backup_data.items():
            if collection_name.startswith('system.'):
                continue
            db[collection_name].drop()
            if docs:
                # Remove string _id, let MongoDB assign new ones
                for doc in docs:
                    if '_id' in doc:
                        del doc['_id']
                db[collection_name].insert_many(docs)
        
        return jsonify({"message": "Database restored successfully from JSON backup"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
