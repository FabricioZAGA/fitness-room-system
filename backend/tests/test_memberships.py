"""Tests for the Memberships API endpoints."""

from datetime import date, datetime, timezone
from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from src.models.membership import MembershipResponse, MembershipStatus, MembershipType


def make_membership_response(overrides: dict | None = None) -> MembershipResponse:
    """Build a mock MembershipResponse for testing."""
    student_id = str(uuid4())
    data = {
        "membership_id": str(uuid4()),
        "student_id": student_id,
        "membership_type": MembershipType.MONTHLY,
        "status": MembershipStatus.ACTIVE,
        "start_date": date.today(),
        "end_date": date(date.today().year, date.today().month + 1 if date.today().month < 12 else 1, 1),
        "price_paid": 500.0,
        "classes_total": None,
        "classes_remaining": None,
        "days_until_expiry": 30,
        "notes": None,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    if overrides:
        data.update(overrides)
    return MembershipResponse(**data)


@pytest.fixture
def sample_membership_create(sample_student_id: str) -> dict:
    """Return a valid membership creation payload."""
    return {
        "student_id": sample_student_id,
        "membership_type": "monthly",
        "start_date": str(date.today()),
        "end_date": str(date(date.today().year + 1, 1, 1)),
        "price_paid": 500.0,
    }


@pytest.fixture
def sample_student_id() -> str:
    """Return a reusable student ID."""
    return str(uuid4())


class TestAssignMembership:
    """Tests for POST /api/v1/memberships."""

    def test_assign_membership_success(
        self, client: TestClient, sample_membership_create: dict
    ) -> None:
        """Should create a membership and return 201."""
        mock_response = make_membership_response(
            {"student_id": sample_membership_create["student_id"]}
        )
        with patch("src.routers.memberships.MembershipService") as mock_svc_cls:
            mock_svc = MagicMock()
            mock_svc.assign_membership.return_value = mock_response
            mock_svc_cls.return_value = mock_svc

            response = client.post("/api/v1/memberships", json=sample_membership_create)

        assert response.status_code == 201
        body = response.json()
        assert "membership_id" in body
        assert body["membership_type"] == "monthly"

    def test_assign_membership_missing_fields(self, client: TestClient) -> None:
        """Should return 422 when required fields are missing."""
        response = client.post(
            "/api/v1/memberships",
            json={"membership_type": "monthly"},
        )
        assert response.status_code == 422

    def test_assign_membership_invalid_type(self, client: TestClient, sample_student_id: str) -> None:
        """Should return 422 for unknown membership type."""
        response = client.post(
            "/api/v1/memberships",
            json={
                "student_id": sample_student_id,
                "membership_type": "invalid_type",
                "start_date": str(date.today()),
                "end_date": str(date.today()),
                "price_paid": 0,
            },
        )
        assert response.status_code == 422


class TestListMembershipsForStudent:
    """Tests for GET /api/v1/memberships/student/{student_id}."""

    def test_list_memberships_success(self, client: TestClient, sample_student_id: str) -> None:
        """Should return a list of memberships for the student."""
        memberships = [
            make_membership_response({"student_id": sample_student_id}) for _ in range(2)
        ]
        with patch("src.routers.memberships.MembershipService") as mock_svc_cls:
            mock_svc = MagicMock()
            mock_svc.list_memberships_for_student.return_value = (memberships, None)
            mock_svc_cls.return_value = mock_svc

            response = client.get(f"/api/v1/memberships/student/{sample_student_id}")

        assert response.status_code == 200
        body = response.json()
        assert len(body["items"]) == 2

    def test_list_memberships_empty(self, client: TestClient, sample_student_id: str) -> None:
        """Should return empty list when student has no memberships."""
        with patch("src.routers.memberships.MembershipService") as mock_svc_cls:
            mock_svc = MagicMock()
            mock_svc.list_memberships_for_student.return_value = ([], None)
            mock_svc_cls.return_value = mock_svc

            response = client.get(f"/api/v1/memberships/student/{sample_student_id}")

        assert response.status_code == 200
        assert response.json()["items"] == []


class TestGetActiveMembership:
    """Tests for GET /api/v1/memberships/student/{student_id}/active."""

    def test_get_active_membership_found(self, client: TestClient, sample_student_id: str) -> None:
        """Should return the active membership."""
        active = make_membership_response(
            {"student_id": sample_student_id, "status": MembershipStatus.ACTIVE}
        )
        with patch("src.routers.memberships.MembershipService") as mock_svc_cls:
            mock_svc = MagicMock()
            mock_svc.get_active_membership.return_value = active
            mock_svc_cls.return_value = mock_svc

            response = client.get(f"/api/v1/memberships/student/{sample_student_id}/active")

        assert response.status_code == 200
        assert response.json()["status"] == "active"

    def test_get_active_membership_not_found(self, client: TestClient, sample_student_id: str) -> None:
        """Should return null when no active membership exists."""
        with patch("src.routers.memberships.MembershipService") as mock_svc_cls:
            mock_svc = MagicMock()
            mock_svc.get_active_membership.return_value = None
            mock_svc_cls.return_value = mock_svc

            response = client.get(f"/api/v1/memberships/student/{sample_student_id}/active")

        assert response.status_code == 200
        assert response.json() is None


class TestCancelMembership:
    """Tests for POST /api/v1/memberships/student/{student_id}/{membership_id}/cancel."""

    def test_cancel_membership_success(self, client: TestClient, sample_student_id: str) -> None:
        """Should cancel the membership and return 200."""
        membership_id = str(uuid4())
        cancelled = make_membership_response(
            {
                "student_id": sample_student_id,
                "membership_id": membership_id,
                "status": MembershipStatus.CANCELLED,
            }
        )
        with patch("src.routers.memberships.MembershipService") as mock_svc_cls:
            mock_svc = MagicMock()
            mock_svc.cancel_membership.return_value = cancelled
            mock_svc_cls.return_value = mock_svc

            response = client.post(
                f"/api/v1/memberships/student/{sample_student_id}/{membership_id}/cancel"
            )

        assert response.status_code == 200
        assert response.json()["status"] == "cancelled"
