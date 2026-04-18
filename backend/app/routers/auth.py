from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.auth import create_access_token, verify_password
from app.database import get_db
from app.deps import get_current_user
from app.models import User
from app.rate_limit import is_locked, record_failure, record_success, seconds_until_unlock
from app.schemas import LoginRequest, TokenResponse, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, request: Request, db: Session = Depends(get_db)):
    key = body.email.lower().strip()

    if is_locked(key):
        wait = seconds_until_unlock(key)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many failed attempts. Try again in {wait} seconds.",
            headers={"Retry-After": str(wait)},
        )

    user = db.query(User).filter(User.email == key).first()
    valid, new_hash = verify_password(body.password, user.password_hash if user else "$argon2id$v=19$m=65536,t=3,p=4$dummy")

    if not user or not valid:
        record_failure(key)
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Transparent rehash: upgrade legacy bcrypt or outdated Argon2 params
    if new_hash:
        user.password_hash = new_hash
        db.commit()

    record_success(key)
    token = create_access_token(user.id)
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return UserOut.model_validate(current_user)


@router.post("/bootstrap", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def bootstrap(body: LoginRequest, db: Session = Depends(get_db)):
    if db.query(User).count() > 0:
        raise HTTPException(status_code=403, detail="Bootstrap unavailable.")
    from app.auth import hash_password
    user = User(email=body.email.lower().strip(), password_hash=hash_password(body.password), full_name="Matt C", role="admin")
    db.add(user)
    db.commit()
    db.refresh(user)
    return TokenResponse(access_token=create_access_token(user.id), user=UserOut.model_validate(user))


