"""
Sync MongoDB connection for legacy services.

Services like IdeaAnalysisService, GeminiService, PDF/PPT generators
still use sync pymongo via `from app import get_db`.

This module provides ONLY the sync pymongo connection.
All HTTP routing is handled by app_fastapi/.
"""

from pymongo import MongoClient
import os

# ─── MongoDB globals (sync pymongo) ───────────────────────────────────────────
mongo_client = None
mongo_db = None


def get_db():
    """Return the sync MongoDB database instance."""
    global mongo_client, mongo_db
    if mongo_db is None:
        _connect()
    return mongo_db


def _connect():
    """Initialize the sync pymongo connection (lazy, on first use)."""
    global mongo_client, mongo_db
    mongo_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017/inceptrax")
    mongo_client = MongoClient(mongo_uri)
    db_name = mongo_uri.rsplit("/", 1)[-1].split("?")[0] if "/" in mongo_uri else "inceptrax"
    mongo_db = mongo_client[db_name]
    print(f"[pymongo] Sync connection established: {db_name}")
