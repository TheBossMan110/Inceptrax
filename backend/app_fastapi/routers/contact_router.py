"""
Contact Router — FastAPI migration of app/routes/contact_routes.py

Endpoints:
    POST /api/contact  — Submit contact form
    POST /api/support  — Submit support ticket
"""

import asyncio
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr, Field

router = APIRouter()


class ContactRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    subject: str = Field(default="New Contact Message", max_length=200)
    message: str = Field(min_length=1, max_length=5000)


class SupportRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    subject: str = Field(min_length=1, max_length=200)
    message: str = Field(min_length=1, max_length=5000)


def _s(message="Success"):
    return JSONResponse(content={"status": "success", "message": message})

def _e(message="Error"):
    return JSONResponse(content={"status": "error", "message": message}, status_code=400)


@router.post("/contact")
async def submit_contact_form(body: ContactRequest):
    from app.services.email_service import EmailService
    try:
        success, msg = await asyncio.to_thread(
            EmailService.send_contact_email,
            body.name, body.email, body.subject, body.message, "contact",
        )
        if success:
            return _s("Message sent successfully")
        return _e(f"Failed to send message: {msg}")
    except Exception as e:
        return _e(f"Failed to send message: {str(e)}")


@router.post("/support")
async def submit_support_ticket(body: SupportRequest):
    from app.services.email_service import EmailService
    try:
        success, msg = await asyncio.to_thread(
            EmailService.send_contact_email,
            body.name, body.email, body.subject, body.message, "support",
        )
        if success:
            return _s("Support ticket created successfully")
        return _e(f"Failed to create ticket: {msg}")
    except Exception as e:
        return _e(f"Failed to create ticket: {str(e)}")
