"""
FastAPI entry point.

Usage:
    uvicorn app_fastapi.main:app --host 0.0.0.0 --port 5000 --reload

Or via docker-compose (after migration):
    CMD ["uvicorn", "app_fastapi.main:app", "--host", "0.0.0.0", "--port", "5000", "--workers", "2"]
"""

from app_fastapi import create_app

app = create_app()
