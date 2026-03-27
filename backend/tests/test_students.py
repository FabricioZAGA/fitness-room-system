"""Tests for the Students API endpoints."""

from datetime import UTC
from unittest.mock import MagicMock, patch
from uuid import uuid4

from fastapi.testclient import TestClient

from src.models.student import StudentResponse, StudentStatus


def make_student_response(overrides: dict | None = None) -> StudentResponse:
    """Build a mock StudentResponse for testing."""
    from datetime import datetime

    data = {
        "student_id": str(uuid4()),
        "first_name": "Ana",
        "last_name": "García",
        "email": "ana.garcia@test.com",
        "phone": "+52 55 1234 5678",
        "status": StudentStatus.NEW,
        "notes": None,
        "created_at": datetime.now(UTC),
        "updated_at": datetime.now(UTC),
    }
    if overrides:
        data.update(overrides)
    return StudentResponse(**data)


class TestCreateStudent:
    """Tests for POST /api/v1/students."""

    def test_create_student_success(self, client: TestClient, sample_student_create: dict) -> None:
        """Should create a student and return 201."""
        mock_response = make_student_response()
        with patch("src.routers.students.StudentService") as mock_svc_cls:
            mock_svc = MagicMock()
            mock_svc.create_student.return_value = mock_response
            mock_svc_cls.return_value = mock_svc

            response = client.post("/api/v1/students", json=sample_student_create)

        assert response.status_code == 201
        body = response.json()
        assert "student_id" in body
        assert body["email"] == sample_student_create["email"]

    def test_create_student_invalid_email(self, client: TestClient) -> None:
        """Should return 422 for invalid email."""
        response = client.post(
            "/api/v1/students",
            json={"first_name": "Test", "last_name": "User", "email": "not-an-email"},
        )
        assert response.status_code == 422

    def test_create_student_missing_required_fields(self, client: TestClient) -> None:
        """Should return 422 when required fields are missing."""
        response = client.post("/api/v1/students", json={"first_name": "Test"})
        assert response.status_code == 422


class TestGetStudent:
    """Tests for GET /api/v1/students/{student_id}."""

    def test_get_student_success(self, client: TestClient) -> None:
        """Should return the student when found."""
        student_id = str(uuid4())
        mock_response = make_student_response({"student_id": student_id})
        with patch("src.routers.students.StudentService") as mock_svc_cls:
            mock_svc = MagicMock()
            mock_svc.get_student.return_value = mock_response
            mock_svc_cls.return_value = mock_svc

            response = client.get(f"/api/v1/students/{student_id}")

        assert response.status_code == 200
        assert response.json()["student_id"] == student_id

    def test_get_student_not_found(self, client: TestClient) -> None:
        """Should return 404 for non-existent student."""
        from src.utils.exceptions import ResourceNotFoundException

        with patch("src.routers.students.StudentService") as mock_svc_cls:
            mock_svc = MagicMock()
            mock_svc.get_student.side_effect = ResourceNotFoundException("Student not found")
            mock_svc_cls.return_value = mock_svc

            response = client.get("/api/v1/students/nonexistent-id")

        assert response.status_code == 404


class TestListStudents:
    """Tests for GET /api/v1/students."""

    def test_list_students_success(self, client: TestClient) -> None:
        """Should return paginated student list."""
        students = [make_student_response() for _ in range(3)]
        with patch("src.routers.students.StudentService") as mock_svc_cls:
            mock_svc = MagicMock()
            mock_svc.list_students.return_value = (students, None)
            mock_svc_cls.return_value = mock_svc

            response = client.get("/api/v1/students")

        assert response.status_code == 200
        body = response.json()
        assert len(body["items"]) == 3
        assert body["has_more"] is False

    def test_list_students_by_status(self, client: TestClient) -> None:
        """Should filter students by status."""
        active_students = [
            make_student_response({"status": StudentStatus.ACTIVE}) for _ in range(2)
        ]
        with patch("src.routers.students.StudentService") as mock_svc_cls:
            mock_svc = MagicMock()
            mock_svc.list_students.return_value = (active_students, None)
            mock_svc_cls.return_value = mock_svc

            response = client.get("/api/v1/students?status=active")

        assert response.status_code == 200
        assert len(response.json()["items"]) == 2


class TestUpdateStudent:
    """Tests for PATCH /api/v1/students/{student_id}."""

    def test_update_student_success(self, client: TestClient) -> None:
        """Should update student and return updated profile."""
        student_id = str(uuid4())
        updated = make_student_response({"student_id": student_id, "first_name": "Updated"})
        with patch("src.routers.students.StudentService") as mock_svc_cls:
            mock_svc = MagicMock()
            mock_svc.update_student.return_value = updated
            mock_svc_cls.return_value = mock_svc

            response = client.patch(
                f"/api/v1/students/{student_id}",
                json={"first_name": "Updated"},
            )

        assert response.status_code == 200
        assert response.json()["first_name"] == "Updated"


class TestHealthCheck:
    """Tests for GET /health."""

    def test_health_check(self, client: TestClient) -> None:
        """Should return 200 with status ok."""
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"
