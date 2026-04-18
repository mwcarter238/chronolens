import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.database import Base


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default="employee")
    timezone = Column(String(50), nullable=False, default="UTC")
    created_at = Column(DateTime, nullable=False, default=_now)

    paycodes = relationship("Paycode", back_populates="user", cascade="all, delete-orphan")
    time_entries = relationship("TimeEntry", back_populates="user", cascade="all, delete-orphan")


class Paycode(Base):
    __tablename__ = "paycodes"

    id = Column(String(36), primary_key=True, default=_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    color_hex = Column(String(7), nullable=False, default="#0A84FF")
    type = Column(String(20), nullable=False, default="regular")
    hourly_rate = Column(Float, nullable=True)
    is_pinned = Column(Boolean, nullable=False, default=False)
    sort_order = Column(Integer, nullable=False, default=0)
    archived_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=_now)

    user = relationship("User", back_populates="paycodes")
    time_entries = relationship("TimeEntry", back_populates="paycode")


class Invite(Base):
    __tablename__ = "invites"

    id = Column(String(36), primary_key=True, default=_uuid)
    email = Column(String(255), nullable=False, index=True)
    token = Column(String(128), unique=True, nullable=False, index=True)
    invited_by_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, nullable=False, default=_now)
    expires_at = Column(DateTime, nullable=False)
    accepted_at = Column(DateTime, nullable=True)

    invited_by = relationship("User", foreign_keys=[invited_by_id])


class TimeEntry(Base):
    __tablename__ = "time_entries"

    id = Column(String(36), primary_key=True, default=_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    paycode_id = Column(String(36), ForeignKey("paycodes.id"), nullable=False, index=True)
    started_at = Column(DateTime, nullable=False)
    stopped_at = Column(DateTime, nullable=True)
    break_seconds = Column(Integer, nullable=False, default=0)
    notes = Column(Text, nullable=True)
    source = Column(String(20), nullable=False, default="tap")
    created_at = Column(DateTime, nullable=False, default=_now)
    updated_at = Column(DateTime, nullable=False, default=_now, onupdate=_now)

    user = relationship("User", back_populates="time_entries")
    paycode = relationship("Paycode", back_populates="time_entries")
