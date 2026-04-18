from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, field_validator


# ── Auth ──────────────────────────────────────────────────────────────────────

class InviteSendRequest(BaseModel):
    email: EmailStr


class InviteValidateResponse(BaseModel):
    email: str
    invited_by: str
    expires_at: datetime


class InviteAcceptRequest(BaseModel):
    full_name: str
    password: str

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 12:
            raise ValueError("Password must be at least 12 characters")
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one number")
        return v


class InviteOut(BaseModel):
    id: str
    email: str
    invited_by: str
    expires_at: datetime
    accepted_at: Optional[datetime]
    created_at: datetime

    model_config = {"from_attributes": True}


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    timezone: str
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ── Paycodes ──────────────────────────────────────────────────────────────────

PAYCODE_COLORS = [
    "#0A84FF", "#30D158", "#FF9F0A", "#FF453A", "#BF5AF2",
    "#FF375F", "#64D2FF", "#FFD60A", "#AC8E68", "#6E6E73",
    "#5E5CE6", "#32D74B",
]

PAYCODE_TYPES = ["regular", "overtime", "pto", "holiday", "billable"]


class PaycodeCreate(BaseModel):
    name: str
    color_hex: str = "#0A84FF"
    type: str = "regular"
    hourly_rate: Optional[float] = None
    is_pinned: bool = False

    @field_validator("type")
    @classmethod
    def validate_type(cls, v: str) -> str:
        if v not in PAYCODE_TYPES:
            raise ValueError(f"type must be one of {PAYCODE_TYPES}")
        return v


class PaycodeUpdate(BaseModel):
    name: Optional[str] = None
    color_hex: Optional[str] = None
    type: Optional[str] = None
    hourly_rate: Optional[float] = None
    is_pinned: Optional[bool] = None
    sort_order: Optional[int] = None


class PaycodeOut(BaseModel):
    id: str
    user_id: str
    name: str
    color_hex: str
    type: str
    hourly_rate: Optional[float]
    is_pinned: bool
    sort_order: int
    archived_at: Optional[datetime]
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Time Entries ───────────────────────────────────────────────────────────────

class EntryStartRequest(BaseModel):
    paycode_id: str
    notes: Optional[str] = None


class EntryStopRequest(BaseModel):
    notes: Optional[str] = None


class EntryUpdate(BaseModel):
    started_at: Optional[datetime] = None
    stopped_at: Optional[datetime] = None
    notes: Optional[str] = None


class TimeEntryOut(BaseModel):
    id: str
    user_id: str
    paycode_id: str
    started_at: datetime
    stopped_at: Optional[datetime]
    break_seconds: int
    notes: Optional[str]
    source: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TimeEntryWithPaycode(TimeEntryOut):
    paycode: PaycodeOut


# ── Reports ────────────────────────────────────────────────────────────────────

class PaycodeSummary(BaseModel):
    paycode: PaycodeOut
    total_seconds: int
    entry_count: int
    dollar_total: Optional[float]


class DailyReport(BaseModel):
    date: str
    total_seconds: int
    summaries: list[PaycodeSummary]


class WeeklyDayBreakdown(BaseModel):
    date: str
    total_seconds: int
    summaries: list[PaycodeSummary]


class WeeklyReport(BaseModel):
    week_start: str
    week_end: str
    total_seconds: int
    days: list[WeeklyDayBreakdown]
    summaries: list[PaycodeSummary]


class MonthlyReport(BaseModel):
    year: int
    month: int
    total_seconds: int
    days: list[WeeklyDayBreakdown]
    summaries: list[PaycodeSummary]
