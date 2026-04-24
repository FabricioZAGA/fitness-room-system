"""Admin endpoints for SES email-delivery health and suppression list.

Surfaces the same data that previously required AWS CLI:

- ``GET /email-admin/suppressions`` — list all suppressed recipients with
  reason (BOUNCE / COMPLAINT) and last-update timestamp.
- ``DELETE /email-admin/suppressions/{email}`` — remove a recipient from
  the suppression list (use after confirming the address is correct).

All routes are admin-only. Every modification is logged so we have an
audit trail for regulatory / operational reviews.
"""

from datetime import datetime
from typing import Any

import boto3
from aws_lambda_powertools import Logger
from botocore.exceptions import ClientError
from fastapi import APIRouter, Depends, HTTPException, Path, status
from pydantic import BaseModel, EmailStr

from src.config import get_settings
from src.models.common import MessageResponse
from src.utils.auth import get_current_user, require_admin_only

logger = Logger()

router = APIRouter(prefix="/email-admin", tags=["Email Admin"])


# ── Response schemas ──────────────────────────────────────────────────────────


class SuppressedEntry(BaseModel):
    """Single entry on the SES account-level suppression list."""

    email: EmailStr
    reason: str  # "BOUNCE" | "COMPLAINT"
    last_update_time: str  # ISO-8601


class SuppressionListResponse(BaseModel):
    """Page of suppressed entries."""

    items: list[SuppressedEntry]
    count: int


# ── Helpers ───────────────────────────────────────────────────────────────────


def _sesv2_client() -> Any:
    settings = get_settings()
    return boto3.client("sesv2", region_name=settings.aws_region)


# ── Endpoints ─────────────────────────────────────────────────────────────────


@router.get(
    "/suppressions",
    response_model=SuppressionListResponse,
    summary="List suppressed email addresses",
    description=(
        "Return every address SES is currently refusing to deliver to, with "
        "the reason (hard bounce or spam complaint) and timestamp. "
        "Useful to triage why users are not receiving welcome / reset emails."
    ),
    dependencies=[Depends(require_admin_only())],
)
def list_suppressions(
    limit: int = 200,
    _current_user: dict[str, Any] = Depends(get_current_user),
) -> SuppressionListResponse:
    """List account-level suppressed destinations."""
    client = _sesv2_client()
    items: list[SuppressedEntry] = []
    params: dict[str, Any] = {"PageSize": min(limit, 1000)}
    try:
        while True:
            resp = client.list_suppressed_destinations(**params)
            for s in resp.get("SuppressedDestinationSummaries", []):
                ts = s.get("LastUpdateTime")
                items.append(
                    SuppressedEntry(
                        email=s["EmailAddress"],
                        reason=s.get("Reason", "UNKNOWN"),
                        last_update_time=(
                            ts.isoformat() if isinstance(ts, datetime) else str(ts)
                        ),
                    )
                )
                if len(items) >= limit:
                    break
            token = resp.get("NextToken")
            if not token or len(items) >= limit:
                break
            params["NextToken"] = token
    except ClientError as exc:
        logger.exception("Failed to list SES suppressions")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"SES error: {exc.response.get('Error', {}).get('Message', str(exc))}",
        ) from exc

    return SuppressionListResponse(items=items, count=len(items))


@router.delete(
    "/suppressions/{email}",
    response_model=MessageResponse,
    summary="Remove address from suppression list",
    description=(
        "Delete an address from the SES suppression list so the system can "
        "attempt delivery again. Returns 404 if the address is not suppressed."
    ),
    dependencies=[Depends(require_admin_only())],
)
def delete_suppression(
    email: str = Path(..., description="Email address to un-suppress"),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> MessageResponse:
    """Remove an email from the SES suppression list."""
    client = _sesv2_client()
    try:
        client.delete_suppressed_destination(EmailAddress=email)
    except ClientError as exc:
        code = exc.response.get("Error", {}).get("Code")
        if code == "NotFoundException":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"{email} is not on the suppression list.",
            ) from exc
        logger.exception("Failed to delete suppression", extra={"email": email})
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"SES error: {exc.response.get('Error', {}).get('Message', str(exc))}",
        ) from exc

    # Audit: who cleared which address.
    logger.info(
        "Suppression cleared",
        extra={
            "email": email,
            "actor_sub": current_user.get("sub"),
            "actor_email": current_user.get("email"),
        },
    )
    return MessageResponse(message=f"{email} fue removido de la lista de supresión.")
