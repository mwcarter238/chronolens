from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import Paycode, TimeEntry, User
from app.schemas import EntryStartRequest, EntryStopRequest, EntryUpdate, TimeEntryOut, TimeEntryWithPaycode

router = APIRouter(prefix="/entries", tags=["entries"])


def _now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _get_active_entry(user_id: str, db: Session) -> Optional[TimeEntry]:
    return (
        db.query(TimeEntry)
        .filter(TimeEntry.user_id == user_id, TimeEntry.stopped_at.is_(None))
        .first()
    )


@router.get("/active", response_model=Optional[TimeEntryWithPaycode])
def get_active_entry(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    entry = _get_active_entry(current_user.id, db)
    if not entry:
        return None
    return _enrich(entry)


@router.post("/start", response_model=TimeEntryWithPaycode, status_code=status.HTTP_201_CREATED)
def start_timer(
    body: EntryStartRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    paycode = (
        db.query(Paycode)
        .filter(
            Paycode.id == body.paycode_id,
            Paycode.user_id == current_user.id,
            Paycode.archived_at.is_(None),
        )
        .first()
    )
    if not paycode:
        raise HTTPException(status_code=404, detail="Paycode not found")

    # Auto-stop any currently running entry
    active = _get_active_entry(current_user.id, db)
    if active:
        if active.paycode_id == body.paycode_id:
            # Tapping the already-active paycode → stop it instead
            active.stopped_at = _now()
            db.commit()
            db.refresh(active)
            return _enrich(active)
        active.stopped_at = _now()

    entry = TimeEntry(
        user_id=current_user.id,
        paycode_id=body.paycode_id,
        started_at=_now(),
        notes=body.notes,
        source="tap",
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return _enrich(entry)


@router.post("/stop", response_model=TimeEntryWithPaycode)
def stop_timer(
    body: EntryStopRequest = EntryStopRequest(),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    entry = _get_active_entry(current_user.id, db)
    if not entry:
        raise HTTPException(status_code=404, detail="No active timer")
    entry.stopped_at = _now()
    if body.notes is not None:
        entry.notes = body.notes
    db.commit()
    db.refresh(entry)
    return _enrich(entry)


@router.get("", response_model=list[TimeEntryWithPaycode])
def list_entries(
    date: Optional[str] = Query(None, description="YYYY-MM-DD"),
    paycode_id: Optional[str] = Query(None),
    limit: int = Query(100, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(TimeEntry).filter(TimeEntry.user_id == current_user.id)
    if date:
        try:
            d = datetime.strptime(date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(status_code=400, detail="date must be YYYY-MM-DD")
        from datetime import timedelta
        q = q.filter(TimeEntry.started_at >= d, TimeEntry.started_at < d + timedelta(days=1))
    if paycode_id:
        q = q.filter(TimeEntry.paycode_id == paycode_id)
    entries = q.order_by(TimeEntry.started_at.desc()).limit(limit).all()
    return [_enrich(e) for e in entries]


@router.patch("/{entry_id}", response_model=TimeEntryWithPaycode)
def update_entry(
    entry_id: str,
    body: EntryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    entry = (
        db.query(TimeEntry)
        .filter(TimeEntry.id == entry_id, TimeEntry.user_id == current_user.id)
        .first()
    )
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(entry, field, value)
    entry.updated_at = _now()
    db.commit()
    db.refresh(entry)
    return _enrich(entry)


def _enrich(entry: TimeEntry) -> dict:
    from app.schemas import PaycodeOut, TimeEntryWithPaycode
    return TimeEntryWithPaycode(
        **TimeEntryOut.model_validate(entry).model_dump(),
        paycode=PaycodeOut.model_validate(entry.paycode),
    )
