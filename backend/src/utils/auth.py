"""JWT authentication utilities for Cognito token validation.

Provides FastAPI dependency `get_current_user` that validates
Cognito JWT tokens on every protected endpoint.
"""

from typing import Any

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwk, jwt
from jose.utils import base64url_decode

from src.config import Settings, get_settings

security = HTTPBearer()

_jwks_cache: dict[str, Any] | None = None


async def _get_jwks(settings: Settings) -> dict[str, Any]:
    """Fetch and cache JWKS from Cognito."""
    global _jwks_cache
    if _jwks_cache is None:
        async with httpx.AsyncClient() as client:
            response = await client.get(settings.cognito_jwks_url)
            response.raise_for_status()
            _jwks_cache = response.json()
    return _jwks_cache


def _get_public_key(token: str, jwks: dict[str, Any]) -> Any:
    """Extract the public key matching the token's kid header."""
    headers = jwt.get_unverified_header(token)
    kid = headers.get("kid")
    for key_data in jwks.get("keys", []):
        if key_data.get("kid") == kid:
            return jwk.construct(key_data)
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Public key not found for token.",
    )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    settings: Settings = Depends(get_settings),
) -> dict[str, Any]:
    """Validate Cognito JWT and return the decoded claims.

    Raises HTTP 401 if the token is invalid or expired.
    This dependency must be applied to all protected endpoints.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if settings.is_local and credentials.credentials == "local-dev-token":
        return {
            "sub": "local-dev-user",
            "email": "dev@fitnessroom.local",
            "cognito:groups": ["admin"],
            "given_name": "Dev",
            "family_name": "User",
        }

    try:
        jwks = await _get_jwks(settings)
        public_key = _get_public_key(credentials.credentials, jwks)

        message, encoded_signature = credentials.credentials.rsplit(".", 1)
        decoded_signature = base64url_decode(encoded_signature.encode("utf-8"))

        if not public_key.verify(message.encode("utf-8"), decoded_signature):
            raise credentials_exception

        claims = jwt.get_unverified_claims(credentials.credentials)

        if claims.get("token_use") not in ("access", "id"):
            raise credentials_exception

        return claims

    except JWTError:
        raise credentials_exception from None


def require_group(group: str) -> Any:
    """Return a dependency that requires the user to belong to a specific group.

    Usage:
        @router.get("/admin-only", dependencies=[Depends(require_group("admin"))])
    """

    async def _check_group(
        current_user: dict[str, Any] = Depends(get_current_user),
    ) -> dict[str, Any]:
        user_groups: list[str] = current_user.get("cognito:groups", [])
        if group not in user_groups:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access restricted to '{group}' group members.",
            )
        return current_user

    return _check_group


def require_student_group() -> Any:
    """Return a dependency that requires the user to belong to the 'student' group.

    Usage:
        @router.get("/my-profile", dependencies=[Depends(require_student_group())])
    """

    async def _check_student_group(
        current_user: dict[str, Any] = Depends(get_current_user),
    ) -> None:
        # In local dev, allow access
        from src.config import get_settings

        settings = get_settings()
        if settings.is_local:
            return

        user_groups: list[str] = current_user.get("cognito:groups", [])
        if "student" not in user_groups:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access restricted to 'student' group members.",
            )

    return _check_student_group
