"""Tests for the check-in endpoint."""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch

from src.main import app


@pytest.fixture()
def client() -> TestClient:
    return TestClient(app)


class TestCheckin:
    """Test suite for POST /students/{id}/checkin."""

    def test_checkin_active_student_with_valid_membership(self, client: TestClient) -> None:
        """Active student with valid membership should be allowed entry."""
        with (
            patch("src.services.checkin_service.StudentRepository") as mock_student_repo,
            patch("src.services.checkin_service.MembershipRepository") as mock_membership_repo,
        ):
            mock_student = MagicMock()
            mock_student.status = "active"
            mock_student_repo.return_value.get_by_id.return_value = mock_student
            mock_student_repo.return_value.put_checkin = MagicMock()

            mock_membership = MagicMock()
            mock_membership.to_response.return_value.days_until_expiry = 30
            mock_membership.membership_type = "monthly"
            mock_membership_repo.return_value.get_active_for_student.return_value = mock_membership

            response = client.post(
                "/api/v1/students/test-student-id/checkin",
                headers={"Authorization": "Bearer local-dev-token"},
            )
            assert response.status_code == 200
            data = response.json()
            assert data["can_enter"] is True
            assert data["reason"] == "all_good"

    def test_checkin_inactive_student_denied(self, client: TestClient) -> None:
        """Inactive student should be denied entry."""
        with patch("src.services.checkin_service.StudentRepository") as mock_student_repo:
            mock_student = MagicMock()
            mock_student.status = "inactive"
            mock_student_repo.return_value.get_by_id.return_value = mock_student
            mock_student_repo.return_value.put_checkin = MagicMock()

            with patch("src.services.checkin_service.MembershipRepository"):
                response = client.post(
                    "/api/v1/students/inactive-student-id/checkin",
                    headers={"Authorization": "Bearer local-dev-token"},
                )
                assert response.status_code == 200
                data = response.json()
                assert data["can_enter"] is False
                assert data["reason"] == "inactive"

    def test_checkin_no_membership_denied(self, client: TestClient) -> None:
        """Student without membership should be denied."""
        with (
            patch("src.services.checkin_service.StudentRepository") as mock_student_repo,
            patch("src.services.checkin_service.MembershipRepository") as mock_membership_repo,
        ):
            mock_student = MagicMock()
            mock_student.status = "active"
            mock_student_repo.return_value.get_by_id.return_value = mock_student
            mock_student_repo.return_value.put_checkin = MagicMock()
            mock_membership_repo.return_value.get_active_for_student.return_value = None

            response = client.post(
                "/api/v1/students/no-membership-id/checkin",
                headers={"Authorization": "Bearer local-dev-token"},
            )
            assert response.status_code == 200
            data = response.json()
            assert data["can_enter"] is False
            assert data["reason"] == "no_membership"
