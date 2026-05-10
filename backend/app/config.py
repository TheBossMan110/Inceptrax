import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    # Core Flask
    SECRET_KEY = os.getenv('SECRET_KEY')
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', os.getenv('SECRET_KEY'))

    # MongoDB
    MONGODB_URI = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/inceptrax')

    # AI / APIs — no hardcoded fallbacks
    GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
    GEMINI_MODEL = os.getenv('GEMINI_MODEL', 'gemini-2.5-flash')
    SERPAPI_KEY = os.getenv('SERPAPI_KEY')

    # Email
    MAIL_USERNAME = os.getenv('MAIL_USERNAME')
    MAIL_PASSWORD = os.getenv('MAIL_PASSWORD')

    # Frontend URL for CORS and password reset links
    FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:3000')

    # Token expiry (in days)
    JWT_ACCESS_TOKEN_EXPIRES = int(os.getenv('JWT_ACCESS_EXPIRES', '7'))
    JWT_REFRESH_TOKEN_EXPIRES = int(os.getenv('JWT_REFRESH_EXPIRES', '30'))
