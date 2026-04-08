"""Stats router — single endpoint for dashboard metrics."""

from datetime import date
from typing import Any

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
    """Fetch all dashboard stats in one request."""
    today = date.today().isoformat()

    student_repo = StudentRepository()
    class_repo = ClassRepository()
    instructor_repo = InstructorRepository()
    membership_repo = MembershipRepository()

    # Active students count
    active_students_items, _ = student_repo.list_all(
        status=StudentStatus.ACTIVE, limit=500
    )
    # Also count founders
    founder_items, _ = student_repo.list_all(
        status=StudentStatus.FOUNDER, limit=200
    )
    active_students = len(active_students_items) + len(founder_items)

    # Today's classes count
    today_classes_items, _ = class_repo.list_by_date(class_date=today, limit=50)
    today_classes = len(today_classes_items)

    # Active instructors count
    active_instructor_items, _ = instructor_repo.list_by_status(
        status=InstructorStatus.ACTIVE, limit=100
    )
    active_instructors = len(active_instructor_items)

    # Upcoming classes (next 5) - get all and filter for future dates
    all_classes_items, _ = class_repo.list_all(limit=100, scan_index_forward=True)
    upcoming_classes = []
    for cls in all_classes_items:
        if cls.class_date >= today and not cls.is_cancelled:
            upcoming_classes.append(cls.to_response())
            if len(upcoming_classes) >= 5:
                break

    # Expiring memberships in 7 days
    expiring_items, _ = membership_repo.list_expiring_soon(days=7)
    expiring_memberships_7d = len(expiring_items)

    # Build student name map for expiring memberships
    student_ids = list({m.student_id for m in expiring_items})
    student_name_map: dict[str, str] = {}
    for sid in student_ids:
        try:
            s = student_repo.get_by_id(sid)
            student_name_map[sid] = f"{s.first_name} {s.last_name}"
        except Exception:  # noqa: BLE001
            student_name_map[sid] = sid[:8] + "…"

    expiring_memberships = [
        MembershipWithStudent(
            **m.to_response().model_dump(),
            student_name=student_name_map.get(m.student_id, ""),
        )
        for m in expiring_items
    ]

    return DashboardStats(
        active_students=active_students,
        today_classes=today_classes,
        active_instructors=active_instructors,
        expiring_memberships_7d=expiring_memberships_7d,
        upcoming_classes=upcoming_classes,
        expiring_memberships=expiring_memberships,
    )
