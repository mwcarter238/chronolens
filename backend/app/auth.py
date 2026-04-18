"""
Password hashing: Argon2id (winner of Password Hashing Competition).

Parameters follow the OWASP recommended minimums for Argon2id:
  - time_cost  : 3 iterations
  - memory_cost: 65536 KiB (64 MB)
  - parallelism: 4 lanes

Legacy bcrypt hashes (from before Argon2 migration) are still verified
and transparently rehashed to Argon2id on the next successful login.
"""

from datetime import datetime, timedelta, timezone

import bcrypt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, VerifyMismatchError
from jose import JWTError, jwt

from app.config import settings

_ph = PasswordHasher(
    time_cost=3,
    memory_cost=65536,   # 64 MB
    parallelism=4,
    hash_len=32,
    salt_len=16,
)


def hash_password(password: str) -> str:
    """Return an Argon2id hash of the password."""
    return _ph.hash(password)


def verify_password(plain: str, hashed: str) -> tuple[bool, str | None]:
    """
    Verify a password against its stored hash.

    Returns (is_valid, new_hash_or_none).
    If the stored hash is a legacy bcrypt hash, it is verified with bcrypt
    and, on success, a fresh Argon2id hash is returned so the caller can
    update the stored value (transparent rehash).
    """
    # ── Legacy bcrypt (prefix $2b$ or $2a$) ──────────────────────────────────
    if hashed.startswith(("$2b$", "$2a$", "$2y$")):
        ok = bcrypt.checkpw(plain.encode(), hashed.encode())
        if ok:
            return True, hash_password(plain)   # return new Argon2id hash
        return False, None

    # ── Argon2id ──────────────────────────────────────────────────────────────
    try:
        _ph.verify(hashed, plain)
        # Check whether parameters have changed since hash was created
        new_hash = _ph.hash(plain) if _ph.check_needs_rehash(hashed) else None
        return True, new_hash
    except VerifyMismatchError:
        return False, None
    except Exception:
        return False, None


# ── JWT ───────────────────────────────────────────────────────────────────────

def create_access_token(subject: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode({"sub": subject, "exp": expire}, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> str | None:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload.get("sub")
    except JWTError:
        return None


def create_invite_token() -> str:
    """Return a 48-byte URL-safe random token for invite links."""
    import secrets
    return secrets.token_urlsafe(48)
