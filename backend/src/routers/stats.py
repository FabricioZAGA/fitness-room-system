"""Stats router — single endpoint for dashboard metrics."""

from typing import Any

from aws_lambda_powertools import Logger
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from src.models.class_model import ClassResponse
from src.models.instructor import InstructorStatus
from src.models.membership import MembershipResponse
from src.models.student import StudentStatus
from src.repositories.class_repository import ClassRepository
from src.repositories.instructor_repository import InstructorRepository
from src.repositories.membership_repository import MembershipRepository
from src.repositories.student_repository import StudentRepository
from src.utils.auth import get_current_user

logger = Logger()

router = APIRouter(prefix="/stats", tags=["Stats"])


class MembershipWithStudent(MembershipResponse):
    """Membership response enriched with student display name."""

    student_name: str = ""


class DashboardStats(BaseModel):
    """Dashboard statistics response — all data in one call."""

    active_students: int
    today_classes: int
    active_instructors: int
    expiring_memberships_7d: int
    upcoming_classes: list[ClassResponse]
    expiring_memberships: list[MembershipWithStudent]


@router.get(
    "",
    response_model=DashboardStats,
    summary="Dashboard Stats",
    description=(
        "Returns all dashboard statistics in a single call. "
        "Replaces multiple individual API calls on the frontend dashboard."
    ),
)
def get_dashboard_stats(
    _current_user: dict[str, Any] = Depends(get_current_user),
) -> DashboardStats:
    """Fetch all dashboard stats in one request.

    Each data source is wrapped in its own try/except so a partial failure
    (e.g. one corrupt membership row) returns a degraded payload instead of
    a blank 500 error that would leave the dashboard empty.
    """
    from src.models.common import mexico_today
    today = mexico_today().isoformat()

    student_repo = StudentRepository()
    class_repo = ClassRepository()
    instructor_repo = InstructorRepository()
    membership_repo = MembershipRepository()

    def _safe(section: str, fn):  # type: ignore[no-untyped-def]
        try:
            return fn()
        except Exception:  # noqa: BLE001
            logger.exception("stats: %s failed", section)
            return None

    active_students = _safe(
        "active_students",
        lambda: len(student_repo.list_all(status=StudentStatus.ACTIVE, limit=500)[0]),
    ) or 0

    today_classes = _safe(
        "today_classes",
        lambda: len(class_repo.list_by_date(class_date=today, limit=50)[0]),
    ) or 0

    active_instructors = _safe(
        "active_instructors",
        lambda: len(
            instructor_repo.list_by_status(status=InstructorStatus.ACTIVE, limit=100)[0]
        ),
    ) or 0

    # Upcoming classes (next 5) — skip individual rows that fail to serialize
    upcoming_classes: list[ClassResponse] = []
    try:
        all_classes_items, _ = class_repo.list_all(limit=100, scan_index_forward=True)
        for cls in all_classes_items:
            try:
                if cls.class_date >= today and not cls.is_cancelled:
                    upcoming_classes.append(cls.to_response())
                    if len(upcoming_classes) >= 5:
                        break
            except Exception:  # noqa: BLE001
                logger.exception(
                    "stats: skipping class %s", getattr(cls, "class_id", "?")
                )
    except Exception:  # noqa: BLE001
        logger.exception("stats: upcoming_classes failed")

    # Expiring memberships in 7 days — also skip bad rows individually
    expiring_items_raw: list[Any] = []
    try:
        expiring_items_raw, _ = membership_repo.list_expiring_soon(days=7)
    except Exception:  # noqa: BLE001
        logger.exception("stats: list_expiring_soon failed")

    expiring_memberships_7d = len(expiring_items_raw)

    student_ids = list({m.student_id for m in expiring_items_raw})
    student_name_map: dict[str, str] = {}
    for sid in student_ids:
        try:
            s = student_repo.get_by_id(sid)
            student_name_map[sid] = f"{s.first_name} {s.last_name}"
        except Exception:  # noqa: BLE001
            student_name_map[sid] = sid[:8] + "…"

    expiring_memberships: list[MembershipWithStudent] = []
    for m in expiring_items_raw:
        try:
            expiring_memberships.append(
                MembershipWithStudent(
                    **m.to_response().model_dump(),
                    student_name=student_name_map.get(m.student_id, ""),
                )
            )
        except Exception:  # noqa: BLE001
            logger.exception(
                "stats: skipping membership %s",
                getattr(m, "membership_id", "?"),
            )

    return DashboardStats(
        active_students=active_students,
        today_classes=today_classes,
        active_instructors=active_instructors,
        expiring_memberships_7d=expiring_memberships_7d,
        upcoming_classes=upcoming_classes,
        expiring_memberships=expiring_memberships,
    )
