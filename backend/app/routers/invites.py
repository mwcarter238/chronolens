from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import create_access_token, create_invite_token, hash_password
from app.config import settings
from app.database import get_db
from app.deps import get_current_user
from app.email_service import send_invite_email
from app.models import Invite, User
from app.schemas import (
    InviteAcceptRequest,
    InviteSendRequest,
    InviteValidateResponse,
    TokenResponse,
    UserOut,
)

router = APIRouter(prefix="/invites", tags=["invites"])


def _now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _get_valid_invite(token: str, db: Session) -> Invite:
    invite = db.query(Invite).filter(Invite.token == token).first()
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found or already used.")
    if invite.accepted_at is not None:
        raise HTTPException(status_code=410, detail="This invite has already been used.")
    if _now() > invite.expires_at:
        raise HTTPException(status_code=410, detail="This invite link has expired.")
    return invite


@router.post("", status_code=status.HTTP_202_ACCEPTED)
def send_invite(
    body: InviteSendRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Send an email invite to a new user.
    The invite token is valid for INVITE_EXPIRE_HOURS hours.
    Existing pending invites for the same email are invalidated.
    """
    # Prevent inviting someone who already has an account
    if db.query(User).filter(User.email == body.email.lower()).first():
        raise HTTPException(status_code=409, detail="A user with that email already exists.")

    # Expire any existing pending invite for this address
    existing = (
        db.query(Invite)
        .filter(Invite.email == body.email.lower(), Invite.accepted_at.is_(None))
        .first()
    )
    if existing:
        existing.expires_at = _now()  # invalidate immediately

    token = create_invite_token()
    invite = Invite(
        email=body.email.lower(),
        token=token,
        invited_by_id=current_user.id,
        expires_at=_now() + timedelta(hours=settings.INVITE_EXPIRE_HOURS),
    )
    db.add(invite)
    db.commit()

    invite_link = f"{settings.APP_URL}/accept-invite?token={token}"

    # Send email in the background so the API responds immediately
    background_tasks.add_task(
        send_invite_email,
        to_email=body.email,
        invite_link=invite_link,
        invited_by_name=current_user.full_name,
    )

    return {"detail": f"Invite sent to {body.email}."}


@router.get("/{token}", response_model=InviteValidateResponse)
def validate_invite(token: str, db: Session = Depends(get_db)):
    """
    Validate an invite token before showing the account-setup form.
    Returns the invited email and who sent the invite.
    """
    invite = _get_valid_invite(token, db)
    return InviteValidateResponse(
        email=invite.email,
        invited_by=invite.invited_by.full_name,
        expires_at=invite.expires_at,
    )


@router.post("/{token}/accept", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def accept_invite(token: str, body: InviteAcceptRequest, db: Session = Depends(get_db)):
    """
    Create the user's account and mark the invite as consumed.
    Returns a JWT so the user is immediately logged in.
    """
    invite = _get_valid_invite(token, db)

    # Guard against race conditions — check again inside the same transaction
    if db.query(User).filter(User.email == invite.email).first():
        raise HTTPException(status_code=409, detail="An account with this email already exists.")

    user = User(
        email=invite.email,
        password_hash=hash_password(body.password),
        full_name=body.full_name.strip(),
        role="employee",
    )
    db.add(user)

    invite.accepted_at = _now()
    db.commit()
    db.refresh(user)

    token_str = create_access_token(user.id)
    return TokenResponse(access_token=token_str, user=UserOut.model_validate(user))
