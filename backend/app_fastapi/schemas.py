"""
Pydantic v2 schemas for request/response validation.

All API inputs/outputs go through these models.
Pydantic handles validation, serialization, and OpenAPI doc generation automatically.
"""

from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional
from datetime import datetime


# ══════════════════════════════════════════════════════════════════════════════
# Auth Schemas
# ══════════════════════════════════════════════════════════════════════════════

class RegisterRequest(BaseModel):
    email: EmailStr
    first_name: str = Field(min_length=1, max_length=50)
    last_name: str = Field(min_length=1, max_length=50)
    password: str = Field(min_length=8, max_length=128)

    @field_validator('email')
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.strip().lower()

    @field_validator('first_name', 'last_name')
    @classmethod
    def strip_whitespace(cls, v: str) -> str:
        return v.strip()


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)

    @field_validator('email')
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.strip().lower()


class ForgotPasswordRequest(BaseModel):
    email: EmailStr

    @field_validator('email')
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.strip().lower()


class ResetPasswordRequest(BaseModel):
    password: str = Field(min_length=8, max_length=128)


class RefreshTokenRequest(BaseModel):
    refresh_token: Optional[str] = None


# ══════════════════════════════════════════════════════════════════════════════
# User Schemas
# ══════════════════════════════════════════════════════════════════════════════

class UserResponse(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: str
    is_admin: bool = False
    api_credits_used: int = 0
    created_at: str
    is_discoverable: bool = False
    bio: Optional[str] = None
    skills: Optional[str] = None
    looking_for: Optional[str] = None
    linkedin_url: Optional[str] = None


class UpdateProfileRequest(BaseModel):
    first_name: Optional[str] = Field(None, min_length=1, max_length=50)
    last_name: Optional[str] = Field(None, min_length=1, max_length=50)
    email: Optional[EmailStr] = None

    @field_validator('first_name', 'last_name', mode='before')
    @classmethod
    def strip_whitespace(cls, v):
        if v is not None:
            return v.strip()
        return v


class ChangePasswordRequest(BaseModel):
    new_password: str = Field(min_length=8, max_length=128)


# ══════════════════════════════════════════════════════════════════════════════
# Common Response Schemas
# ══════════════════════════════════════════════════════════════════════════════

class SuccessResponse(BaseModel):
    status: str = "success"
    message: str = "Success"
    data: Optional[dict] = None


class ErrorResponse(BaseModel):
    status: str = "error"
    message: str
    errors: Optional[dict] = None


class AuthResponse(BaseModel):
    message: str
    token: str
    refresh_token: Optional[str] = None
    user: UserResponse


class StatItem(BaseModel):
    name: str
    value: str
