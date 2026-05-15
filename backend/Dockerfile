# ════════════════════════════════════════════════════════════════════════
# Inceptrax Backend — Production Dockerfile (FastAPI + Uvicorn)
# ════════════════════════════════════════════════════════════════════════
# Python 3.11 | async MongoDB via motor | Uvicorn ASGI server
# Includes system deps for ReportLab (PDF) and python-pptx fonts
# ════════════════════════════════════════════════════════════════════════

FROM python:3.11-slim

WORKDIR /app

# ─── System dependencies ──────────────────────────────────────────────
# ReportLab needs Pango/PangoFT2 for font rendering in PDFs
# gcc needed for bcrypt compilation
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpango-1.0-0 \
    libpangoft2-1.0-0 \
    libpangocairo-1.0-0 \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

# ─── Python dependencies ──────────────────────────────────────────────
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ─── Application code ─────────────────────────────────────────────────
COPY . .

# ─── Non-root user for security ───────────────────────────────────────
RUN useradd -m -r appuser && chown -R appuser:appuser /app
USER appuser

# ─── Expose port ───────────────────────────────────────────────────────
EXPOSE 5000

# ─── Health check ──────────────────────────────────────────────────────
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:5000/api/health')" || exit 1

# ─── Start command (FastAPI + Uvicorn) ─────────────────────────────────
CMD ["uvicorn", "app_fastapi.main:app", "--host", "0.0.0.0", "--port", "5000", "--workers", "2", "--timeout-keep-alive", "120"]
