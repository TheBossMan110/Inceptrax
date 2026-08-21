"""
Inngest client — singleton used by all Inngest functions.

In development: set INNGEST_DEV=1 and run the Inngest Dev Server.
In production: set INNGEST_EVENT_KEY and INNGEST_SIGNING_KEY from Inngest Cloud.
"""

import os
import logging
from dotenv import load_dotenv

load_dotenv()

import inngest

# Dev mode if INNGEST_DEV is set (no signing key needed)
_is_dev = os.getenv("INNGEST_DEV", "").lower() in ("1", "true", "yes")

inngest_client = inngest.Inngest(
    app_id="inceptrax",
    is_production=not _is_dev,
    logger=logging.getLogger("uvicorn"),
)
