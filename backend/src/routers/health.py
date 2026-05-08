"""Health check router — public endpoint, no authentication required."""

from fastapi import APIRouter
from pydantic import BaseModel

from src.config import get_settings

router = APIRouter(tags=["Health"])


class HealthResponse(BaseModel):
    """Health check response schema."""

    status: str
    environment: str
    service: str
    version: str


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Health Check",
    description="Public endpoint to verify the API is running. No authentication required.",
)
def health_check() -> HealthResponse:
    """Return the current health status of the API."""
    settings = get_settings()
    return HealthResponse(
        status="ok",
        environment=settings.environment,
        service="fitness-room-api",
        version="1.7.3",
    )
