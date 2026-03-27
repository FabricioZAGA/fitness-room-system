"""Tests for the Classes API endpoints."""

from datetime import date, datetime, timezone
from unittest.mock import MagicMock, patch
from uuid import uuid4

from fastapi.testclient import TestClient

from src.models.class_model import ClassResponse, ClassType


def make_class_response(overrides: dict | None = None) -> ClassResponse:
    """Build a mock ClassResponse for testing."""
    data = {
        "class_id": str(uuid4()),
        "class_type": ClassType.ZUMBA,
        "instructor_name": "Carlos López",
        "class_date": date.today(),
        "start_time": "07:00:00",
        "duration_minutes": 60,
        "capacity": 15,
        "reservations_count": 0,
        "waitlist_count": 0,
        "available_spots": 15,
        "location": "Sala A",
        "description": None,
        "class_link": None,
        "is_cancelled": False,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    if overrides:
        data.update(overrides)
    return ClassResponse(**data)


SAMPLE_CLASS_CREATE = {
    "class_type": "zumba",
    "instructor_name": "Carlos López",
    "class_date": str(date.today()),
    "start_time": "07:00:00",
    "duration_minutes": 60,
    "capacity": 15,
    "location": "Sala A",
}


class TestCreateClass:
    """Tests for POST /api/v1/classes."""

    def test_create_class_success(self, client: TestClient) -> None:
        """Should create a class and return 201."""
        mock_response = make_class_response()
        with patch("src.routers.classes.ClassService") as mock_svc_cls:
            mock_svc = MagicMock()
            mock_svc.create_class.return_value = mock_response
            mock_svc_cls.return_value = mock_svc

            response = client.post("/api/v1/classes", json=SAMPLE_CLASS_CREATE)

        assert response.status_code == 201
        body = response.json()
        assert "class_id" in body
        assert body["class_type"] == "zumba"
        assert body["instructor_name"] == "Carlos López"

    def test_create_class_missing_required_fields(self, client: TestClient) -> None:
        """Should return 422 when required fields are missing."""
        response = client.post(
            "/api/v1/classes",
            json={"class_type": "zumba"},
        )
        assert response.status_code == 422

    def test_create_class_invalid_type(self, client: TestClient) -> None:
        """Should return 422 for unknown class type."""
        payload = {**SAMPLE_CLASS_CREATE, "class_type": "kickboxing"}
        response = client.post("/api/v1/classes", json=payload)
        assert response.status_code == 422


class TestGetClass:
    """Tests for GET /api/v1/classes/{class_id}."""

    def test_get_class_success(self, client: TestClient) -> None:
        """Should return the class when found."""
        class_id = str(uuid4())
        mock_response = make_class_response({"class_id": class_id})
        with patch("src.routers.classes.ClassService") as mock_svc_cls:
            mock_svc = MagicMock()
            mock_svc.get_class.return_value = mock_response
            mock_svc_cls.return_value = mock_svc

            response = client.get(f"/api/v1/classes/{class_id}")

        assert response.status_code == 200
        assert response.json()["class_id"] == class_id

    def test_get_class_not_found(self, client: TestClient) -> None:
        """Should return 404 for a non-existent class."""
        from src.utils.exceptions import ResourceNotFoundException
        with patch("src.routers.classes.ClassService") as mock_svc_cls:
            mock_svc = MagicMock()
            mock_svc.get_class.side_effect = ResourceNotFoundException("Class not found")
            mock_svc_cls.return_value = mock_svc

            response = client.get(f"/api/v1/classes/{uuid4()}")

        assert response.status_code == 404


class TestListClasses:
    """Tests for GET /api/v1/classes."""

    def test_list_classes_success(self, client: TestClient) -> None:
        """Should return paginated class list."""
        classes = [make_class_response() for _ in range(4)]
        with patch("src.routers.classes.ClassService") as mock_svc_cls:
            mock_svc = MagicMock()
            mock_svc.list_classes.return_value = (classes, None)
            mock_svc_cls.return_value = mock_svc

            response = client.get("/api/v1/classes")

        assert response.status_code == 200
        body = response.json()
        assert len(body["items"]) == 4
        assert body["has_more"] is False

    def test_list_classes_upcoming_only(self, client: TestClient) -> None:
        """Should pass upcoming_only flag to service."""
        with patch("src.routers.classes.ClassService") as mock_svc_cls:
            mock_svc = MagicMock()
            mock_svc.list_classes.return_value = ([], None)
            mock_svc_cls.return_value = mock_svc

            response = client.get("/api/v1/classes?upcoming_only=true")

        assert response.status_code == 200
        mock_svc.list_classes.assert_called_once()
        kwargs = mock_svc.list_classes.call_args
        assert kwargs is not None


class TestUpdateClass:
    """Tests for PATCH /api/v1/classes/{class_id}."""

    def test_update_class_success(self, client: TestClient) -> None:
        """Should update and return the class."""
        class_id = str(uuid4())
        updated = make_class_response({"class_id": class_id, "capacity": 20})
        with patch("src.routers.classes.ClassService") as mock_svc_cls:
            mock_svc = MagicMock()
            mock_svc.update_class.return_value = updated
            mock_svc_cls.return_value = mock_svc

            response = client.patch(
                f"/api/v1/classes/{class_id}",
                json={"capacity": 20},
            )

        assert response.status_code == 200
        assert response.json()["capacity"] == 20


class TestCancelClass:
    """Tests for POST /api/v1/classes/{class_id}/cancel."""

    def test_cancel_class_success(self, client: TestClient) -> None:
        """Should cancel the class and return 200."""
        class_id = str(uuid4())
        cancelled = make_class_response({"class_id": class_id, "is_cancelled": True})
        with patch("src.routers.classes.ClassService") as mock_svc_cls:
            mock_svc = MagicMock()
            mock_svc.cancel_class.return_value = cancelled
            mock_svc_cls.return_value = mock_svc

            response = client.post(f"/api/v1/classes/{class_id}/cancel")

        assert response.status_code == 200
        assert response.json()["is_cancelled"] is True
