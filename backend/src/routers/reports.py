"""Reports router — business intelligence endpoints for gym management."""

from datetime import date, timedelta
from typing import Any

from fastapi import APIRouter, Depends, Query

from src.services.report_service import ReportService
from src.utils.auth import get_current_user

router = APIRouter(prefix="/reports", tags=["Reports"])


def get_service() -> ReportService:
    return ReportService()


@router.get(
    "/income",
    summary="Income Report",
    description=(
        "Aggregate income by date range. "
        "Returns per-day breakdown and totals by payment method and transaction type."
    ),
)
def income_report(
    start_date: date = Query(
        default=None,
        description="Start date YYYY-MM-DD (default: first day of current month)",
    ),
    end_date: date = Query(
        default=None,
        description="End date YYYY-MM-DD (default: today)",
    ),
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: ReportService = Depends(get_service),
) -> dict[str, Any]:
    today = date.today()
    actual_end = end_date or today
    actual_start = start_date or today.replace(day=1)
    return service.income_by_date_range(actual_start, actual_end)


@router.get(
    "/attendance",
    summary="Attendance Summary",
    description="Count reservation statuses (attended, no-show, etc.) over the last N days.",
)
def attendance_report(
    days: int = Query(default=30, ge=1, le=365, description="Number of days back to analyze"),
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: ReportService = Depends(get_service),
) -> dict[str, Any]:
    return service.attendance_summary(days=days)


@router.get(
    "/rankings",
    summary="Top Students Ranking",
    description="Return the top students ranked by successful check-ins in the last N days.",
)
def rankings(
    limit: int = Query(default=10, ge=1, le=50, description="Number of top students to return"),
    days: int = Query(default=30, ge=1, le=365, description="Lookback window in days"),
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: ReportService = Depends(get_service),
) -> list[dict[str, Any]]:
    return service.top_students_by_checkins(limit=limit, days=days)


@router.get(
    "/inactive",
    summary="Inactive Students",
    description=(
        "List active/founder students who haven't checked in successfully "
        "in the last N days. Useful for follow-up outreach."
    ),
)
def inactive_students(
    days: int = Query(
        default=14,
        ge=1,
        le=365,
        description="Number of days without check-in to consider inactive",
    ),
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: ReportService = Depends(get_service),
) -> list[dict[str, Any]]:
    return service.inactive_students(inactive_days=days)
