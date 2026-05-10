from functools import wraps
from flask import request, jsonify
from app.services.auth_service import AuthService
from app.models.user_model import User


def token_required(f):
    """Decorator to protect routes with JWT authentication."""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None

        # 1. Check httpOnly cookie first (primary — set by backend on login)
        token = request.cookies.get('access_token')

        # 2. Fall back to Authorization header (for API testing / mobile)
        if not token:
            auth_header = request.headers.get('Authorization', '')
            if auth_header.startswith('Bearer '):
                token = auth_header.split(' ')[1]

        if not token:
            return jsonify({'error': 'Authentication required'}), 401

        user_id = AuthService.decode_token(token)

        if isinstance(user_id, str):
            return jsonify({'error': user_id}), 401

        user = User.find_by_id(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 401

        return f(user, *args, **kwargs)

    return decorated


def admin_required(f):
    """Decorator to restrict routes to admin users only.
    Must be used AFTER @token_required."""
    @wraps(f)
    def decorated(current_user, *args, **kwargs):
        if not current_user.is_admin:
            return jsonify({'error': 'Admin access required'}), 403
        return f(current_user, *args, **kwargs)

    return decorated
