from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import Paycode, User
from app.schemas import PaycodeCreate, PaycodeOut, PaycodeUpdate

router = APIRouter(prefix="/paycodes", tags=["paycodes"])


def _get_paycode_or_404(paycode_id: str, user: User, db: Session) -> Paycode:
    pc = (
        db.query(Paycode)
        .filter(Paycode.id == paycode_id, Paycode.user_id == user.id)
        .first()
    )
    if not pc:
        raise HTTPException(status_code=404, detail="Paycode not found")
    return pc


@router.get("", response_model=list[PaycodeOut])
def list_paycodes(
    include_archived: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Paycode).filter(Paycode.user_id == current_user.id)
    if not include_archived:
        q = q.filter(Paycode.archived_at.is_(None))
    return q.order_by(Paycode.is_pinned.desc(), Paycode.sort_order, Paycode.created_at).all()


@router.post("", response_model=PaycodeOut, status_code=status.HTTP_201_CREATED)
def create_paycode(
    body: PaycodeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    count = db.query(Paycode).filter(Paycode.user_id == current_user.id).count()
    pc = Paycode(
        user_id=current_user.id,
        name=body.name,
        color_hex=body.color_hex,
        type=body.type,
        hourly_rate=body.hourly_rate,
        is_pinned=body.is_pinned,
        sort_order=count,
    )
    db.add(pc)
    db.commit()
    db.refresh(pc)
    return pc


@router.patch("/{paycode_id}", response_model=PaycodeOut)
def update_paycode(
    paycode_id: str,
    body: PaycodeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    pc = _get_paycode_or_404(paycode_id, current_user, db)
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(pc, field, value)
    db.commit()
    db.refresh(pc)
    return pc


@router.delete("/{paycode_id}", status_code=status.HTTP_204_NO_CONTENT)
def archive_paycode(
    paycode_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from datetime import datetime, timezone
    pc = _get_paycode_or_404(paycode_id, current_user, db)
    pc.archived_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()
