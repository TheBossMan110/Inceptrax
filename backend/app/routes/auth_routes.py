from flask import Blueprint, request, jsonify, make_response
from app.services.auth_service import AuthService
from app.middleware.auth_middleware import token_required
import os

auth_bp = Blueprint('auth', __name__)

# Cookie config
IS_PRODUCTION = os.environ.get('FLASK_ENV') == 'production'
COOKIE_MAX_AGE = 7 * 24 * 60 * 60  # 7 days


def _set_auth_cookie(response, token):
    """Set httpOnly JWT cookie on the response."""
    response.set_cookie(
        'access_token',
        value=token,
        httponly=True,
        secure=IS_PRODUCTION,         # Secure=True only in production (HTTPS)
        samesite='Lax',               # Lax allows top-level navigations
        max_age=COOKIE_MAX_AGE,
        path='/',
    )
    return response


def _clear_auth_cookie(response):
    """Clear the httpOnly JWT cookie."""
    response.set_cookie(
        'access_token',
        value='',
        httponly=True,
        secure=IS_PRODUCTION,
        samesite='Lax',
        max_age=0,
        path='/',
    )
    return response


@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Missing request data'}), 400

    response_data, status = AuthService.register_user(data)

    # If registration succeeded (has token), set httpOnly cookie
    if status == 201 and 'token' in response_data:
        token = response_data['token']
        resp = make_response(jsonify(response_data), status)
        _set_auth_cookie(resp, token)
        return resp

    return jsonify(response_data), status


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Missing request data'}), 400

    response_data, status = AuthService.login_user(data)

    # If login succeeded (has token), set httpOnly cookie
    if status == 200 and 'token' in response_data:
        token = response_data['token']
        resp = make_response(jsonify(response_data), status)
        _set_auth_cookie(resp, token)
        return resp

    return jsonify(response_data), status


@auth_bp.route('/me', methods=['GET'])
@token_required
def get_me(current_user):
    return jsonify({'user': current_user.to_dict()}), 200


@auth_bp.route('/logout', methods=['POST'])
def logout():
    """Proper logout: blacklist token + clear httpOnly cookie."""
    # Check cookie first, then Authorization header
    token = request.cookies.get('access_token')
    if not token:
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]

    if token:
        AuthService.blacklist_token(token)

    resp = make_response(jsonify({'message': 'Logged out successfully'}), 200)
    _clear_auth_cookie(resp)
    return resp


@auth_bp.route('/refresh', methods=['POST'])
def refresh_token():
    """Exchange a valid refresh token for a new access token."""
    # Try cookie, then header, then body
    token = request.cookies.get('access_token')
    if not token:
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
        else:
            data = request.get_json(silent=True) or {}
            token = data.get('refresh_token', '')

    if not token:
        return jsonify({'error': 'Refresh token required'}), 400

    response_data, status = AuthService.refresh_access_token(token)

    # If refresh succeeded, set new cookie
    if status == 200 and 'token' in response_data:
        resp = make_response(jsonify(response_data), status)
        _set_auth_cookie(resp, response_data['token'])
        return resp

    return jsonify(response_data), status


@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    """Send a password reset link via email.
    Always returns success to prevent email enumeration attacks."""
    data = request.get_json(silent=True) or {}
    email = (data.get('email') or '').strip().lower()

    if not email:
        return jsonify({'error': 'Email is required'}), 400

    from app.models.user_model import User
    import jwt
    import datetime
    from flask import current_app

    user = User.find_by_email(email)
    if user:
        # Generate reset token (short-lived: 1 hour)
        secret = current_app.config.get('JWT_SECRET_KEY', current_app.config.get('SECRET_KEY'))
        reset_token = jwt.encode({
            'sub': user.id,
            'type': 'password_reset',
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=1),
            'iat': datetime.datetime.utcnow(),
        }, secret, algorithm='HS256')

        # Send email (best effort — don't fail the request if email fails)
        try:
            from app.services.email_service import EmailService
            frontend_url = current_app.config.get('FRONTEND_URL', 'http://localhost:3000')
            reset_link = f"{frontend_url}/reset-password/{reset_token}"
            EmailService.send_contact_email(
                name=user.first_name,
                user_email=user.email,
                subject="Password Reset Request",
                message=f"Click this link to reset your password:\n\n{reset_link}\n\nThis link expires in 1 hour.",
                type='password_reset'
            )
        except Exception as e:
            print(f"Failed to send reset email: {e}")

    # Always return success (never reveal if email exists)
    return jsonify({
        'message': 'If an account with that email exists, a reset link has been sent.'
    }), 200


@auth_bp.route('/reset-password/<token>', methods=['POST'])
def reset_password(token):
    """Reset password using a valid reset token."""
    data = request.get_json(silent=True) or {}
    new_password = data.get('password', '')

    if not new_password:
        return jsonify({'error': 'New password is required'}), 400

    # Validate password strength
    valid, error = AuthService.validate_password(new_password)
    if not valid:
        return jsonify({'error': error}), 400

    import jwt
    from flask import current_app
    from app.models.user_model import User

    try:
        secret = current_app.config.get('JWT_SECRET_KEY', current_app.config.get('SECRET_KEY'))
        payload = jwt.decode(token, secret, algorithms=['HS256'])

        if payload.get('type') != 'password_reset':
            return jsonify({'error': 'Invalid reset token'}), 400

        user = User.find_by_id(payload['sub'])
        if not user:
            return jsonify({'error': 'Invalid reset token'}), 400

        user.set_password(new_password)
        user.save()

        return jsonify({'message': 'Password reset successfully. You can now log in.'}), 200

    except jwt.ExpiredSignatureError:
        return jsonify({'error': 'Reset link has expired. Please request a new one.'}), 400
    except jwt.InvalidTokenError:
        return jsonify({'error': 'Invalid reset token'}), 400
