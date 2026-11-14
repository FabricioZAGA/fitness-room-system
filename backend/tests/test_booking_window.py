"""Tests for the class enrollment-opening window (v3.2.0).

A class opens for self-service enrollment at 00:00 (Mexico City) of the day
that is ``booking_opens_days_before`` calendar days before the class date.
Front desk (``staff_override``) is exempt.
"""

from datetime import date, datetime, time
from unittest.mock import patch

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from src.models.class_model import (
    DEFAULT_BOOKING_OPENS_DAYS_BEFORE,
    ClassCreate,
    ClassDynamoItem,
    ClassUpdate,
    booking_opens_at,
)
from src.models.common import MX_TZ
from src.models.reservation import ReservationCreate, ReservationStatus
from src.models.student import StudentCreate
from src.repositories.class_repository import ClassRepository
from src.repositories.student_repository import StudentRepository
from src.routers.portal import _booking_window_fields
from src.services.reservation_service import ReservationService

CLASS_DATE = date(2026, 12, 10)


def _mx(year: int, month: int, day: int, hour: int = 0, minute: int = 0) -> datetime:
    return datetime(year, month, day, hour, minute, tzinfo=MX_TZ)


class TestBookingOpensAt:
    """Pure helper: calendar-day opening at 00:00 Mexico City."""

    def test_one_day_before_opens_previous_midnight(self) -> None:
        assert booking_opens_at(CLASS_DATE, 1) == _mx(2026, 12, 9)

    def test_zero_days_opens_same_day_midnight(self) -> None:
        assert booking_opens_at(CLASS_DATE, 0) == _mx(2026, 12, 10)

    def test_crosses_month_and_year(self) -> None:
        assert booking_opens_at("2027-01-03", 5) == _mx(2026, 12, 29)

    def test_accepts_iso_string(self) -> None:
        assert booking_opens_at("2026-12-10", 10) == _mx(2026, 11, 30)


class TestModels:
    """Defaults, validation and legacy compatibility."""

    def _create(self, **kwargs: object) -> ClassCreate:
        data: dict[str, object] = {
            "class_type": "zumba",
            "instructor_name": "Carlos López",
            "class_date": CLASS_DATE,
            "start_time": time(18, 0),
        }
        data.update(kwargs)
        return ClassCreate(**data)  # type: ignore[arg-type]

    def test_create_defaults_to_one_day(self) -> None:
        assert self._create().booking_opens_days_before == DEFAULT_BOOKING_OPENS_DAYS_BEFORE == 1

    @pytest.mark.parametrize("days", [-1, 31])
    def test_create_rejects_out_of_range(self, days: int) -> None:
        with pytest.raises(ValueError):
            self._create(booking_opens_days_before=days)

    def test_response_exposes_opening_datetime(self) -> None:
        item = ClassDynamoItem.from_create(self._create(booking_opens_days_before=5))
        response = item.to_response()
        assert response.booking_opens_days_before == 5
        assert response.booking_opens_at == _mx(2026, 12, 5)

    def test_legacy_item_without_attribute_defaults_to_one(self) -> None:
        raw = ClassDynamoItem.from_create(self._create()).model_dump(mode="json")
        raw.pop("booking_opens_days_before")
        item = ClassDynamoItem.model_validate(raw)
        assert item.booking_opens_days_before == 1
        assert item.to_response().booking_opens_at == _mx(2026, 12, 9)


@pytest.mark.usefixtures("dynamo")
class TestReservationServiceWindow:
    """Business rule enforced in ReservationService.create_reservation."""

    def _setup(self, days_before: int = 5) -> tuple[str, str]:
        class_item = ClassRepository().create(
            ClassCreate(
                class_type="zumba",
                instructor_name="Carlos López",
                class_date=CLASS_DATE,
                start_time=time(18, 0),
                booking_opens_days_before=days_before,
            )
        )
        student = StudentRepository().create(
            StudentCreate(first_name="Ana", last_name="Prueba", email="ana@test.mx")
        )
        return class_item.class_id, student.student_id

    def _reserve(self, class_id: str, student_id: str, now: datetime, **kwargs: bool) -> str:
        with patch("src.services.reservation_service.mexico_now", return_value=now):
            result = ReservationService().create_reservation(
                ReservationCreate(student_id=student_id, class_id=class_id), **kwargs
            )
        return result.status

    def test_blocks_before_window_opens(self) -> None:
        class_id, student_id = self._setup(days_before=5)
        with pytest.raises(HTTPException) as exc:
            self._reserve(class_id, student_id, _mx(2026, 12, 4, 23, 59))
        assert exc.value.status_code == 400
        assert "sábado 5 de diciembre a las 00:00" in str(exc.value.detail)

    def test_allows_at_opening_midnight(self) -> None:
        class_id, student_id = self._setup(days_before=5)
        status = self._reserve(class_id, student_id, _mx(2026, 12, 5, 0, 0))
        assert status == ReservationStatus.CONFIRMED

    def test_staff_override_skips_window(self) -> None:
        class_id, student_id = self._setup(days_before=1)
        status = self._reserve(
            class_id, student_id, _mx(2026, 11, 14, 10, 0), staff_override=True
        )
        assert status == ReservationStatus.CONFIRMED

    def test_window_follows_class_edit(self) -> None:
        class_id, student_id = self._setup(days_before=1)
        now = _mx(2026, 12, 5, 12, 0)
        with pytest.raises(HTTPException):
            self._reserve(class_id, student_id, now)
        ClassRepository().update(class_id, ClassUpdate(booking_opens_days_before=10))
        assert self._reserve(class_id, student_id, now) == ReservationStatus.CONFIRMED


class TestPortalFields:
    """Portal payload carries the precomputed window so the UI never recomputes it."""

    def _item(self, days_before: int) -> ClassDynamoItem:
        return ClassDynamoItem.from_create(
            ClassCreate(
                class_type="yoga",
                instructor_name="Ana García",
                class_date=CLASS_DATE,
                start_time=time(7, 0),
                booking_opens_days_before=days_before,
            )
        )

    def test_closed_before_opening(self) -> None:
        with patch("src.routers.portal.mexico_now", return_value=_mx(2026, 12, 8, 23, 0)):
            fields = _booking_window_fields(self._item(1))
        assert fields == {
            "booking_opens_days_before": 1,
            "booking_opens_at": "2026-12-09T00:00:00-06:00",
            "booking_open": False,
        }

    def test_open_after_opening(self) -> None:
        with patch("src.routers.portal.mexico_now", return_value=_mx(2026, 12, 9, 0, 0)):
            assert _booking_window_fields(self._item(1))["booking_open"] is True


class TestClassesApiValidation:
    """POST/PATCH /api/v1/classes reject out-of-range values."""

    def test_create_rejects_more_than_30_days(self, client: TestClient) -> None:
        response = client.post(
            "/api/v1/classes",
            json={
                "class_type": "zumba",
                "instructor_name": "Carlos López",
                "class_date": "2026-12-10",
                "start_time": "18:00:00",
                "booking_opens_days_before": 31,
            },
        )
        assert response.status_code == 422

    def test_update_rejects_negative(self, client: TestClient) -> None:
        response = client.patch(
            "/api/v1/classes/some-id", json={"booking_opens_days_before": -1}
        )
        assert response.status_code == 422
