from datetime import date, datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import Paycode, TimeEntry, User
from app.schemas import (
    DailyReport,
    MonthlyReport,
    PaycodeOut,
    PaycodeSummary,
    WeeklyDayBreakdown,
    WeeklyReport,
)

router = APIRouter(prefix="/reports", tags=["reports"])


def _entry_seconds(entry: TimeEntry, reference_now: datetime) -> int:
    end = entry.stopped_at or reference_now
    return max(0, int((end - entry.started_at).total_seconds()) - entry.break_seconds)


def _build_summaries(
    entries: list[TimeEntry],
    paycodes: dict[str, Paycode],
    reference_now: datetime,
) -> list[PaycodeSummary]:
    totals: dict[str, int] = {}
    counts: dict[str, int] = {}
    for e in entries:
        secs = _entry_seconds(e, reference_now)
        totals[e.paycode_id] = totals.get(e.paycode_id, 0) + secs
        counts[e.paycode_id] = counts.get(e.paycode_id, 0) + 1

    result = []
    for pid, total in totals.items():
        pc = paycodes.get(pid)
        if not pc:
            continue
        dollar = (total / 3600 * pc.hourly_rate) if pc.hourly_rate else None
        result.append(
            PaycodeSummary(
                paycode=PaycodeOut.model_validate(pc),
                total_seconds=total,
                entry_count=counts[pid],
                dollar_total=round(dollar, 2) if dollar is not None else None,
            )
        )
    return sorted(result, key=lambda s: s.total_seconds, reverse=True)


def _entries_for_range(
    user_id: str, start: datetime, end: datetime, db: Session
) -> list[TimeEntry]:
    return (
        db.query(TimeEntry)
        .filter(
            TimeEntry.user_id == user_id,
            TimeEntry.started_at >= start,
            TimeEntry.started_at < end,
        )
        .all()
    )


def _all_paycodes(user_id: str, db: Session) -> dict[str, Paycode]:
    pcs = db.query(Paycode).filter(Paycode.user_id == user_id).all()
    return {p.id: p for p in pcs}


@router.get("/daily", response_model=DailyReport)
def daily_report(
    date_str: Optional[str] = Query(None, alias="date", description="YYYY-MM-DD; defaults to today"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    now = datetime.utcnow()
    if date_str:
        d = datetime.strptime(date_str, "%Y-%m-%d")
    else:
        d = now.replace(hour=0, minute=0, second=0, microsecond=0)

    start = d.replace(hour=0, minute=0, second=0, microsecond=0)
    end = start + timedelta(days=1)
    entries = _entries_for_range(current_user.id, start, end, db)
    paycodes = _all_paycodes(current_user.id, db)
    summaries = _build_summaries(entries, paycodes, now)
    total = sum(s.total_seconds for s in summaries)

    return DailyReport(
        date=start.strftime("%Y-%m-%d"),
        total_seconds=total,
        summaries=summaries,
    )


@router.get("/weekly", response_model=WeeklyReport)
def weekly_report(
    date_str: Optional[str] = Query(None, alias="date", description="Any date in the week (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    now = datetime.utcnow()
    if date_str:
        ref = datetime.strptime(date_str, "%Y-%m-%d")
    else:
        ref = now

    # Monday of the week
    week_start = ref - timedelta(days=ref.weekday())
    week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
    week_end = week_start + timedelta(days=7)

    all_entries = _entries_for_range(current_user.id, week_start, week_end, db)
    paycodes = _all_paycodes(current_user.id, db)

    days = []
    for i in range(7):
        day_start = week_start + timedelta(days=i)
        day_end = day_start + timedelta(days=1)
        day_entries = [e for e in all_entries if day_start <= e.started_at < day_end]
        summaries = _build_summaries(day_entries, paycodes, now)
        days.append(
            WeeklyDayBreakdown(
                date=day_start.strftime("%Y-%m-%d"),
                total_seconds=sum(s.total_seconds for s in summaries),
                summaries=summaries,
            )
        )

    overall = _build_summaries(all_entries, paycodes, now)
    total = sum(s.total_seconds for s in overall)

    return WeeklyReport(
        week_start=week_start.strftime("%Y-%m-%d"),
        week_end=(week_end - timedelta(days=1)).strftime("%Y-%m-%d"),
        total_seconds=total,
        days=days,
        summaries=overall,
    )


@router.get("/monthly", response_model=MonthlyReport)
def monthly_report(
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    now = datetime.utcnow()
    y = year or now.year
    m = month or now.month

    month_start = datetime(y, m, 1)
    if m == 12:
        month_end = datetime(y + 1, 1, 1)
    else:
        month_end = datetime(y, m + 1, 1)

    all_entries = _entries_for_range(current_user.id, month_start, month_end, db)
    paycodes = _all_paycodes(current_user.id, db)

    days = []
    cursor = month_start
    while cursor < month_end:
        next_day = cursor + timedelta(days=1)
        day_entries = [e for e in all_entries if cursor <= e.started_at < next_day]
        summaries = _build_summaries(day_entries, paycodes, now)
        days.append(
            WeeklyDayBreakdown(
                date=cursor.strftime("%Y-%m-%d"),
                total_seconds=sum(s.total_seconds for s in summaries),
                summaries=summaries,
            )
        )
        cursor = next_day

    overall = _build_summaries(all_entries, paycodes, now)
    total = sum(s.total_seconds for s in overall)

    return MonthlyReport(
        year=y,
        month=m,
        total_seconds=total,
        days=days,
        summaries=overall,
    )
