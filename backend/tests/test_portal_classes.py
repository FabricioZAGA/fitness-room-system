"""Tests for GET /api/v1/portal/classes ordering."""

import json
from datetime import time, timedelta

import pytest

from src.models.class_model import ClassCreate
from src.models.common import mexico_today
from src.repositories.class_repository import ClassRepository
from src.repositories.reservation_repository import ReservationRepository
from src.repositories.student_repository import StudentRepository
from src.routers.portal import get_upcoming_classes

pytestmark = pytest.mark.usefixtures("dynamo")

STAFF_USER = {"sub": "teacher-1", "cognito:groups": ["teacher"]}


def _create(days_ahead: int, hour: int) -> None:
    ClassRepository().create(
        ClassCreate(
            class_type="yoga",
            instructor_name="Ana García",
            class_date=mexico_today() + timedelta(days=days_ahead),
            start_time=time(hour, 0),
        )
    )


def test_classes_are_sorted_by_date_then_start_time() -> None:
    """Earliest class first within each day, regardless of creation order or class_id."""
    for days_ahead, hour in [(2, 7), (1, 18), (1, 9), (1, 8), (2, 6), (1, 20)]:
        _create(days_ahead, hour)

    response = get_upcoming_classes(
        current_user=STAFF_USER,
        student_repo=StudentRepository(),
        class_repo=ClassRepository(),
        reservation_repo=ReservationRepository(),
        days=7,
    )
    items = json.loads(bytes(response.body))["items"]

    order = [(i["class_date"], i["start_time"][:5]) for i in items]
    assert order == sorted(order)
    assert [t for _, t in order] == ["08:00", "09:00", "18:00", "20:00", "06:00", "07:00"]
