"""API routes for Cognito user management (admin only)."""

from typing import Any

from aws_lambda_powertools import Logger
from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, EmailStr, Field

from src.config import get_settings
from src.models.common import MessageResponse
from src.services.cognito_service import VALID_GROUPS, CognitoService
from src.services.event_notifier import EventNotifier
from src.utils.auth import get_current_user, require_admin_only

logger = Logger()

router = APIRouter(prefix="/users", tags=["Users"])


# ── Request / Response schemas ────────────────────────────────────────────────


class CreateUserRequest(BaseModel):
    """Schema for creating a new Cognito user."""

    email: EmailStr
    name: str = Field(..., min_length=1, max_length=200)
    group: str = Field(..., description="Cognito group: admin, staff, or student")


class UpdateUserGroupsRequest(BaseModel):
    """Schema for updating a user's groups."""

    groups: list[str] = Field(..., min_length=1)


class CognitoUserResponse(BaseModel):
    """Schema for a Cognito user in API responses."""

    username: str
    email: str
    name: str
    status: str
    enabled: bool
    groups: list[str]
    created_at: str


# ── Endpoints ─────────────────────────────────────────────────────────────────


@router.get(
    "",
    response_model=list[CognitoUserResponse],
    summary="List Users",
    description="List all Cognito users with their groups.",
    dependencies=[Depends(require_admin_only())],
)
def list_users(
    _current_user: dict[str, Any] = Depends(get_current_user),
) -> list[CognitoUserResponse]:
    """List all Cognito users."""
    svc = CognitoService()
    users = svc.list_users(limit=200)
    return [CognitoUserResponse(**u) for u in users]


@router.post(
    "",
    response_model=CognitoUserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create User",
    description="Create a new Cognito user and assign to a group.",
    dependencies=[Depends(require_admin_only())],
)
def create_user(
    data: CreateUserRequest,
    _current_user: dict[str, Any] = Depends(get_current_user),
) -> CognitoUserResponse:
    """Create a new Cognito user."""
    if data.group not in VALID_GROUPS:
        from fastapi import HTTPException

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid group '{data.group}'. Must be one of {VALID_GROUPS}",
        )

    # Cross-entity email uniqueness check
    from src.services.uniqueness_service import UniquenessService

    uniqueness = UniquenessService()
    email_error = uniqueness.check_email_available(data.email)
    if email_error:
        from src.utils.exceptions import raise_conflict

        raise_conflict(email_error)

    svc = CognitoService()
    settings = get_settings()
    password = svc.create_user(email=data.email, name=data.name, group=data.group)

    # Send credentials email
    try:
        portal_url = settings.portal_url if data.group != "admin" else settings.frontend_url
        EventNotifier().notify_portal_credentials(
            student_name=data.name,
            student_email=data.email,
            password=password,
            portal_url=portal_url,
        )
    except Exception:
        logger.exception("Failed to send credentials email", extra={"email": data.email})

    user = svc.get_user(data.email)
    return CognitoUserResponse(**user)


@router.get(
    "/{username}",
    response_model=CognitoUserResponse,
    summary="Get User",
    description="Get a Cognito user by username.",
    dependencies=[Depends(require_admin_only())],
)
def get_user(
    username: str,
    _current_user: dict[str, Any] = Depends(get_current_user),
) -> CognitoUserResponse:
    """Get a single Cognito user."""
    svc = CognitoService()
    user = svc.get_user(username)
    return CognitoUserResponse(**user)


@router.patch(
    "/{username}/groups",
    response_model=CognitoUserResponse,
    summary="Update User Groups",
    description="Update a user's group assignments.",
    dependencies=[Depends(require_admin_only())],
)
def update_user_groups(
    username: str,
    data: UpdateUserGroupsRequest,
    _current_user: dict[str, Any] = Depends(get_current_user),
) -> CognitoUserResponse:
    """Update a user's groups."""
    svc = CognitoService()
    svc.update_user_groups(username, data.groups)
    user = svc.get_user(username)
    return CognitoUserResponse(**user)


@router.post(
    "/{username}/disable",
    response_model=MessageResponse,
    summary="Disable User",
    description="Disable a Cognito user.",
    dependencies=[Depends(require_admin_only())],
)
def disable_user(
    username: str,
    _current_user: dict[str, Any] = Depends(get_current_user),
) -> MessageResponse:
    """Disable a Cognito user."""
    svc = CognitoService()
    svc.disable_user(username)
    return MessageResponse(message=f"User '{username}' disabled.")


@router.post(
    "/{username}/enable",
    response_model=MessageResponse,
    summary="Enable User",
    description="Enable a disabled Cognito user.",
    dependencies=[Depends(require_admin_only())],
)
def enable_user(
    username: str,
    _current_user: dict[str, Any] = Depends(get_current_user),
) -> MessageResponse:
    """Enable a Cognito user."""
    svc = CognitoService()
    svc.enable_user(username)
    return MessageResponse(message=f"User '{username}' enabled.")


@router.delete(
    "/{username}",
    response_model=MessageResponse,
    summary="Delete User",
    description="Permanently delete a Cognito user.",
    dependencies=[Depends(require_admin_only())],
)
def delete_user(
    username: str,
    _current_user: dict[str, Any] = Depends(get_current_user),
) -> MessageResponse:
    """Delete a Cognito user."""
    svc = CognitoService()
    svc.delete_user(username)
    return MessageResponse(message=f"User '{username}' deleted.")
