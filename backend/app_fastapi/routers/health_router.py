"""
Health Router — FastAPI version of the health check endpoint.

GET /api/health — returns 200 if DB is reachable, 503 if not.
"""

from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
async def health_check():
    """
    Health check endpoint.
    Returns 200 if the app is running and DB is reachable.
    Returns 503 if the database is unreachable.
    """
    from app_fastapi import get_db

    status = {
        "status": "healthy",
        "service": "inceptrax-backend",
    }

    try:
        db = get_db()
        # Ping MongoDB — fast, lightweight check
        await db.command("ping")
        status["database"] = "connected"
    except Exception:
        status["status"] = "degraded"
        status["database"] = "unreachable"
        from fastapi.responses import JSONResponse
        return JSONResponse(content=status, status_code=503)

    return status
