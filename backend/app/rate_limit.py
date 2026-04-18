"""
In-memory brute-force protection for login attempts.

Tracks failed attempts per email address. After LOGIN_MAX_ATTEMPTS
consecutive failures the account is locked for LOGIN_LOCKOUT_SECONDS.
Resets on successful login.
"""

from collections import defaultdict
from datetime import datetime, timezone
from threading import Lock

from app.config import settings


class _AttemptRecord:
    __slots__ = ("count", "locked_until")

    def __init__(self) -> None:
        self.count: int = 0
        self.locked_until: datetime | None = None


_store: dict[str, _AttemptRecord] = defaultdict(_AttemptRecord)
_lock = Lock()


def _now() -> datetime:
    return datetime.now(timezone.utc)


def is_locked(key: str) -> bool:
    """Return True if the key is currently locked out."""
    with _lock:
        rec = _store[key]
        if rec.locked_until and _now() < rec.locked_until:
            return True
        return False


def seconds_until_unlock(key: str) -> int:
    """Seconds remaining in the lockout window (0 if not locked)."""
    with _lock:
        rec = _store[key]
        if rec.locked_until and _now() < rec.locked_until:
            return int((rec.locked_until - _now()).total_seconds()) + 1
        return 0


def record_failure(key: str) -> None:
    """Record a failed login attempt; lock the key if threshold reached."""
    with _lock:
        rec = _store[key]
        # Clear an expired lockout before counting
        if rec.locked_until and _now() >= rec.locked_until:
            rec.count = 0
            rec.locked_until = None
        rec.count += 1
        if rec.count >= settings.LOGIN_MAX_ATTEMPTS:
            from datetime import timedelta
            rec.locked_until = _now() + timedelta(seconds=settings.LOGIN_LOCKOUT_SECONDS)


def record_success(key: str) -> None:
    """Reset the failure counter after a successful login."""
    with _lock:
        _store[key].count = 0
        _store[key].locked_until = None
