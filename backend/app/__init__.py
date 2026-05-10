from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from pymongo import MongoClient
from app.config import Config
import os

# ─── MongoDB globals ──────────────────────────────────────────────────────────
mongo_client = None
mongo_db = None


def get_db():
    """Return the MongoDB database instance."""
    return mongo_db


# Initialize Flask-Limiter globally
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["2000 per day", "300 per hour"],
    storage_uri="memory://",
)


def create_app():
    global mongo_client, mongo_db

    app = Flask(__name__, instance_relative_config=True)
    app.config.from_object(Config)

    # ─── CORS ─────────────────────────────────────────────────────────────
    FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:3000')
    CORS(app, resources={r"/*": {
    "origins": [
        FRONTEND_URL,
        "https://www.inceptrax.com",
        "https://inceptrax.com",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
    ],
    "supports_credentials": True,
    "allow_headers": ["Content-Type", "Authorization"],
    "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    }})

    # ─── MongoDB ──────────────────────────────────────────────────────────
    mongo_uri = app.config.get('MONGODB_URI', 'mongodb://localhost:27017/inceptrax')
    mongo_client = MongoClient(mongo_uri)
    # Extract DB name from URI or default to 'inceptrax'
    db_name = mongo_uri.rsplit('/', 1)[-1].split('?')[0] if '/' in mongo_uri else 'inceptrax'
    mongo_db = mongo_client[db_name]
    print(f"[MongoDB] Connected to database: {db_name}")

    # Create indexes for performance
    _ensure_indexes(mongo_db)

    # ─── Extensions ───────────────────────────────────────────────────────
    limiter.init_app(app)

    # ─── CORS Preflight ───────────────────────────────────────────────────
    @app.before_request
    def handle_options():
        if request.method == "OPTIONS":
            response = app.make_default_options_response()
            origin = request.headers.get('Origin')
            allowed = [
                "https://www.inceptrax.com",
                "https://inceptrax.com",
                "http://localhost:3000",
                "http://localhost:5173",
            ]
            if origin in allowed:
                response.headers['Access-Control-Allow-Origin'] = origin
                response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
                response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
                response.headers['Access-Control-Allow-Credentials'] = 'true'
            return response

    # ─── Blueprints ───────────────────────────────────────────────────────
    from app.routes.auth_routes import auth_bp
    from app.routes.idea_routes import idea_bp
    from app.routes.user_routes import user_bp
    from app.routes.cofounder_routes import cofounder_bp
    from app.routes.admin_routes import admin_bp
    from app.routes.notification_routes import notification_bp
    from app.routes.contact_routes import contact_bp
    from app.routes.chat_routes import chat_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(idea_bp, url_prefix='/api/ideas')
    app.register_blueprint(user_bp, url_prefix='/api/users')
    app.register_blueprint(cofounder_bp, url_prefix='/api/cofounder')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(notification_bp, url_prefix='/api/notifications')
    app.register_blueprint(contact_bp, url_prefix='/api')
    app.register_blueprint(chat_bp, url_prefix='/api/chat')

    # ─── Security Headers ─────────────────────────────────────────────────
    @app.after_request
    def add_security_headers(response):
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        response.headers['Permissions-Policy'] = 'camera=(), microphone=(self), geolocation=()'

        # Only add HSTS in production
        if not app.debug:
            response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'

        return response

    # ─── Error Handlers ───────────────────────────────────────────────────
    @app.errorhandler(429)
    def ratelimit_handler(e):
        return jsonify({"error": "Too many requests. Please slow down.", "message": str(e.description)}), 429

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Resource not found"}), 404

    @app.errorhandler(500)
    def server_error(e):
        return jsonify({"error": "Internal server error"}), 500

    # ─── Background Scheduler ─────────────────────────────────────────────
    try:
        from apscheduler.schedulers.background import BackgroundScheduler
        from app.scheduler import scan_all_active_watches

        scheduler = BackgroundScheduler()
        scheduler.add_job(func=scan_all_active_watches, trigger="interval", hours=24)
        scheduler.start()

        print("[Scheduler] Background scheduler started. Daily competitor scans enabled.")
    except Exception as e:
        print(f"[Scheduler] Failed to start: {e}")

    return app


def _ensure_indexes(db):
    """Create MongoDB indexes for query performance."""
    try:
        db.users.create_index("email", unique=True)
        db.users.create_index("id", unique=True)
        db.ideas.create_index("id", unique=True)
        db.ideas.create_index("user_id")
        db.ideas.create_index("share_token")
        db.ideas.create_index("is_public")
        db.stage_results.create_index([("idea_id", 1), ("stage_name", 1)])
        db.stage_results.create_index("id", unique=True)
        db.token_blacklist.create_index("token", unique=True)
        db.notifications.create_index("user_id")
        db.notifications.create_index("id", unique=True)
        db.messages.create_index("sender_id")
        db.messages.create_index("receiver_id")
        db.messages.create_index("id", unique=True)
        db.comments.create_index("idea_id")
        db.comments.create_index("id", unique=True)
        db.competitor_watch.create_index("idea_id")
        db.competitor_watch.create_index("id", unique=True)
        db.competitor_alerts.create_index("watch_id")
        db.competitor_alerts.create_index("id", unique=True)
        db.counters.create_index("_id")
        print("[MongoDB] Indexes created successfully.")
    except Exception as e:
        print(f"[MongoDB] Index creation warning: {e}")
