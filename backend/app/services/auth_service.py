import jwt
import datetime
import os
from flask import current_app
from app.models.user_model import User, TokenBlacklist
from app import get_db


class AuthService:
    """JWT authentication service with bcrypt password hashing and token blacklisting."""

    @staticmethod
    def generate_tokens(user_id):
        secret = current_app.config.get('JWT_SECRET_KEY', current_app.config.get('SECRET_KEY'))

        access_token = jwt.encode({
            'sub': user_id,
            'type': 'access',
            'exp': datetime.datetime.utcnow() + datetime.timedelta(days=7),
            'iat': datetime.datetime.utcnow(),
        }, secret, algorithm='HS256')

        refresh_token = jwt.encode({
            'sub': user_id,
            'type': 'refresh',
            'exp': datetime.datetime.utcnow() + datetime.timedelta(days=30),
            'iat': datetime.datetime.utcnow(),
        }, secret, algorithm='HS256')

        return access_token, refresh_token

    @staticmethod
    def generate_token(user_id):
        access, _ = AuthService.generate_tokens(user_id)
        return access

    @staticmethod
    def decode_token(token):
        try:
            if TokenBlacklist.find_by_token(token):
                return 'Token has been revoked'

            secret = current_app.config.get('JWT_SECRET_KEY', current_app.config.get('SECRET_KEY'))
            payload = jwt.decode(token, secret, algorithms=['HS256'])
            return payload['sub']
        except jwt.ExpiredSignatureError:
            return 'Token expired. Please log in again.'
        except jwt.InvalidTokenError:
            return 'Invalid token. Please log in again.'

    @staticmethod
    def decode_refresh_token(token):
        try:
            if TokenBlacklist.find_by_token(token):
                return None, 'Token has been revoked'

            secret = current_app.config.get('JWT_SECRET_KEY', current_app.config.get('SECRET_KEY'))
            payload = jwt.decode(token, secret, algorithms=['HS256'])

            if payload.get('type') != 'refresh':
                return None, 'Invalid token type'

            return payload['sub'], None
        except jwt.ExpiredSignatureError:
            return None, 'Refresh token expired. Please log in again.'
        except jwt.InvalidTokenError:
            return None, 'Invalid refresh token.'

    @staticmethod
    def blacklist_token(token):
        try:
            if not TokenBlacklist.find_by_token(token):
                bl = TokenBlacklist(token=token)
                bl.save()
            return True
        except Exception as e:
            print(f"Error blacklisting token: {e}")
            return False

    @staticmethod
    def validate_password(password):
        if not password or len(password) < 8:
            return False, "Password must be at least 8 characters"
        if not any(c.isupper() for c in password):
            return False, "Password must contain at least one uppercase letter"
        if not any(c.islower() for c in password):
            return False, "Password must contain at least one lowercase letter"
        if not any(c.isdigit() for c in password):
            return False, "Password must contain at least one number"
        return True, None

    @staticmethod
    def register_user(data):
        email = (data.get('email') or '').strip().lower()
        first_name = (data.get('first_name') or '').strip()
        last_name = (data.get('last_name') or '').strip()
        password = data.get('password', '')

        if not email:
            return {'error': 'Email is required'}, 400
        if not first_name:
            return {'error': 'First name is required'}, 400
        if not last_name:
            return {'error': 'Last name is required'}, 400

        valid, error = AuthService.validate_password(password)
        if not valid:
            return {'error': error}, 400

        if User.find_by_email(email):
            return {'error': 'An account with this email already exists'}, 409

        user = User(
            first_name=first_name,
            last_name=last_name,
            email=email
        )
        user.set_password(password)
        user.save()

        access_token, refresh_token = AuthService.generate_tokens(user.id)
        return {
            'message': 'Account created successfully',
            'token': access_token,
            'refresh_token': refresh_token,
            'user': user.to_dict()
        }, 201

    @staticmethod
    def login_user(data):
        email = (data.get('email') or '').strip().lower()
        password = data.get('password', '')

        user = User.find_by_email(email)

        if not user or not user.check_password(password):
            return {'error': 'Invalid credentials'}, 401

        access_token, refresh_token = AuthService.generate_tokens(user.id)

        return {
            'message': 'Login successful',
            'token': access_token,
            'refresh_token': refresh_token,
            'user': user.to_dict()
        }, 200

    @staticmethod
    def refresh_access_token(refresh_token):
        user_id, error = AuthService.decode_refresh_token(refresh_token)
        if error:
            return {'error': error}, 401

        user = User.find_by_id(user_id)
        if not user:
            return {'error': 'User not found'}, 401

        new_access_token = AuthService.generate_token(user_id)
        return {
            'token': new_access_token,
            'user': user.to_dict()
        }, 200
