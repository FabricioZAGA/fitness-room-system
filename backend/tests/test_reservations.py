"""Tests for the Reservations API endpoints."""

from datetime import UTC, datetime
from unittest.mock import MagicMock, patch
from uuid import uuid4

from fastapi.testclient import TestClient

from src.models.reservation import ReservationResponse, ReservationStatus


def make_reservation_response(overrides: dict | None = None) -> ReservationResponse:
    """Build a mock ReservationResponse."""
    data = {
        "reservation_id": str(uuid4()),
        "student_id": str(uuid4()),
        "class_id": str(uuid4()),
        "status": ReservationStatus.CONFIRMED,
        "class_date": "2026-06-15",
        "created_at": datetime.now(UTC),
        "updated_at": datetime.now(UTC),
    }
    if overrides:
        data.update(overrides)
    return ReservationResponse(**data)


class TestCreateReservation:
    """Tests for POST /api/v1/reservations."""

    def test_create_reservation_confirmed(self, client: TestClient) -> None:
        """Should confirm reservation when capacity is available."""
        mock_response = make_reservation_response({"status": ReservationStatus.CONFIRMED})
        with patch("src.routers.reservations.ReservationService") as mock_svc_cls:
            mock_svc = MagicMock()
            mock_svc.create_reservation.return_value = mock_response
            mock_svc_cls.return_value = mock_svc

            response = client.post(
                "/api/v1/reservations",
                json={"student_id": str(uuid4()), "class_id": str(uuid4())},
            )

        assert response.status_code == 201
        assert response.json()["status"] == "confirmed"

    def test_create_reservation_waitlisted(self, client: TestClient) -> None:
        """Should return waitlisted status when class is full."""
        mock_response = make_reservation_response(
            {
                "status": ReservationStatus.WAITLISTED,
                "waitlist_position": 1,
            }
        )
        with patch("src.routers.reservations.ReservationService") as mock_svc_cls:
            mock_svc = MagicMock()
            mock_svc.create_reservation.return_value = mock_response
            mock_svc_cls.return_value = mock_svc

            response = client.post(
                "/api/v1/reservations",
                json={"student_id": str(uuid4()), "class_id": str(uuid4())},
            )

        assert response.status_code == 201
        assert response.json()["status"] == "waitlisted"
        assert response.json()["waitlist_position"] == 1

    def test_create_reservation_missing_fields(self, client: TestClient) -> None:
        """Should return 422 when required fields are missing."""
        response = client.post("/api/v1/reservations", json={"student_id": "only-this"})
        assert response.status_code == 422


class TestCancelReservation:
    """Tests for DELETE /api/v1/reservations/class/{class_id}/student/{student_id}."""

    def test_cancel_reservation_success(self, client: TestClient) -> None:
        """Should cancel reservation and return cancelled status."""
        class_id = str(uuid4())
        student_id = str(uuid4())
        mock_response = make_reservation_response(
            {
                "status": ReservationStatus.CANCELLED,
                "student_id": student_id,
                "class_id": class_id,
            }
        )
        with patch("src.routers.reservations.ReservationService") as mock_svc_cls:
            mock_svc = MagicMock()
            mock_svc.cancel_reservation.return_value = (mock_response, None)
            mock_svc_cls.return_value = mock_svc

            response = client.delete(f"/api/v1/reservations/class/{class_id}/student/{student_id}")

        assert response.status_code == 200
        assert response.json()["status"] == "cancelled"


class TestListReservations:
    """Tests for GET /api/v1/reservations endpoints."""

    def test_list_for_class(self, client: TestClient) -> None:
        """Should list reservations for a class."""
        class_id = str(uuid4())
        reservations = [make_reservation_response({"class_id": class_id}) for _ in range(5)]
        with patch("src.routers.reservations.ReservationService") as mock_svc_cls:
            mock_svc = MagicMock()
            mock_svc.list_reservations_for_class.return_value = (reservations, None)
            mock_svc_cls.return_value = mock_svc

            response = client.get(f"/api/v1/reservations/class/{class_id}")

        assert response.status_code == 200
        assert len(response.json()["items"]) == 5

    def test_list_for_student(self, client: TestClient) -> None:
        """Should list all reservations for a student."""
        student_id = str(uuid4())
        reservations = [make_reservation_response({"student_id": student_id}) for _ in range(3)]
        with patch("src.routers.reservations.ReservationService") as mock_svc_cls:
            mock_svc = MagicMock()
            mock_svc.list_reservations_for_student.return_value = (reservations, None)
            mock_svc_cls.return_value = mock_svc

            response = client.get(f"/api/v1/reservations/student/{student_id}")

        assert response.status_code == 200
        assert len(response.json()["items"]) == 3


class TestMarkAttendance:
    """Tests for POST /api/v1/reservations/class/{class_id}/student/{student_id}/attendance."""

    def test_mark_attended(self, client: TestClient) -> None:
        """Should mark student as attended."""
        class_id = str(uuid4())
        student_id = str(uuid4())
        mock_response = make_reservation_response({"status": ReservationStatus.ATTENDED})
        with patch("src.routers.reservations.ReservationService") as mock_svc_cls:
            mock_svc = MagicMock()
            mock_svc.mark_attendance.return_value = mock_response
            mock_svc_cls.return_value = mock_svc

            response = client.post(
                f"/api/v1/reservations/class/{class_id}/student/{student_id}/attendance",
                params={"attended": True},
            )

        assert response.status_code == 200
        assert response.json()["status"] == "attended"
