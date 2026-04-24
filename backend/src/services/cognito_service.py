"""Cognito service — manage Cognito users for portal access."""

import secrets
import string
from typing import Any

import boto3
from aws_lambda_powertools import Logger
from botocore.exceptions import ClientError

from src.config import get_settings

logger = Logger()

# Valid Cognito groups in order of precedence
VALID_GROUPS = ("admin", "receptionist", "staff", "student")


class CognitoService:
    """Service for creating and managing Cognito users."""

    def __init__(self) -> None:
        self._settings = get_settings()
        self._cognito = boto3.client(
            "cognito-idp",
            region_name=self._settings.cognito_region,
        )
        self._pool_id = self._settings.cognito_user_pool_id

    @staticmethod
    def generate_password(length: int = 12) -> str:
        """Generate a secure random password meeting Cognito requirements.

        Password will contain at least one uppercase, lowercase, digit,
        and special character.
        """
        chars = string.ascii_letters + string.digits + "!@#$%&*"
        while True:
            pwd = "".join(secrets.choice(chars) for _ in range(length))
            has_upper = any(c.isupper() for c in pwd)
            has_lower = any(c.islower() for c in pwd)
            has_digit = any(c.isdigit() for c in pwd)
            has_special = any(c in "!@#$%&*" for c in pwd)
            if has_upper and has_lower and has_digit and has_special:
                return pwd

    # ──────────────────────────────────────────────────────────────────────────
    # Create user for any role
    # ──────────────────────────────────────────────────────────────────────────

    def create_user(
        self,
        email: str,
        name: str,
        group: str,
    ) -> str:
        """Create a Cognito user and add to the specified group.

        Args:
            email: User email (used as username).
            name: Display name.
            group: Cognito group name (admin, staff, student).

        Returns:
            The temporary password assigned.

        Raises:
            ValueError: If group is not valid.
            ClientError: If Cognito API call fails.
        """
        if group not in VALID_GROUPS:
            raise ValueError(f"Invalid group '{group}'. Must be one of {VALID_GROUPS}")

        password = self.generate_password()

        parts = name.strip().split(" ", 1)
        given_name = parts[0]
        family_name = parts[1] if len(parts) > 1 else parts[0]

        try:
            self._cognito.admin_create_user(
                UserPoolId=self._pool_id,
                Username=email,
                UserAttributes=[
                    {"Name": "email", "Value": email},
                    {"Name": "email_verified", "Value": "true"},
                    {"Name": "name", "Value": name},
                    {"Name": "given_name", "Value": given_name},
                    {"Name": "family_name", "Value": family_name},
                ],
                MessageAction="SUPPRESS",
            )
            logger.info("Cognito user created", extra={"email": email, "group": group})
        except ClientError as exc:
            if exc.response["Error"]["Code"] == "UsernameExistsException":
                logger.warning(
                    "Cognito user already exists, updating password",
                    extra={"email": email},
                )
            else:
                logger.error(
                    "Failed to create Cognito user",
                    extra={"email": email, "error": str(exc)},
                )
                raise

        self._cognito.admin_set_user_password(
            UserPoolId=self._pool_id,
            Username=email,
            Password=password,
            Permanent=False,
        )

        self._cognito.admin_add_user_to_group(
            UserPoolId=self._pool_id,
            Username=email,
            GroupName=group,
        )
        logger.info("Cognito user added to group", extra={"email": email, "group": group})

        return password

    def create_student_user(self, email: str, name: str) -> str:
        """Create a Cognito user in the 'student' group."""
        return self.create_user(email, name, "student")

    def create_staff_user(self, email: str, name: str) -> str:
        """Create a Cognito user in the 'staff' group (instructors/receptionists)."""
        return self.create_user(email, name, "staff")

    def create_admin_user(self, email: str, name: str) -> str:
        """Create a Cognito user in the 'admin' group."""
        return self.create_user(email, name, "admin")

    # ──────────────────────────────────────────────────────────────────────────
    # List / Get / Delete users
    # ──────────────────────────────────────────────────────────────────────────

    def list_users(self, limit: int = 60) -> list[dict[str, Any]]:
        """List all Cognito users with their groups."""
        users: list[dict[str, Any]] = []
        params: dict[str, Any] = {"UserPoolId": self._pool_id, "Limit": min(limit, 60)}

        while True:
            resp = self._cognito.list_users(**params)
            for u in resp.get("Users", []):
                attrs = {a["Name"]: a["Value"] for a in u.get("Attributes", [])}
                groups = self._get_user_groups(u["Username"])
                users.append({
                    "username": u["Username"],
                    "email": attrs.get("email", ""),
                    "name": attrs.get("name", ""),
                    "status": u.get("UserStatus", ""),
                    "enabled": u.get("Enabled", True),
                    "groups": groups,
                    "created_at": u.get("UserCreateDate", "").isoformat()
                    if u.get("UserCreateDate") else "",
                })
            token = resp.get("PaginationToken")
            if not token or len(users) >= limit:
                break
            params["PaginationToken"] = token

        return users[:limit]

    def _get_user_groups(self, username: str) -> list[str]:
        """Get group names for a user."""
        resp = self._cognito.admin_list_groups_for_user(
            UserPoolId=self._pool_id,
            Username=username,
        )
        return [g["GroupName"] for g in resp.get("Groups", [])]

    def get_user(self, username: str) -> dict[str, Any]:
        """Get a single Cognito user with groups."""
        resp = self._cognito.admin_get_user(
            UserPoolId=self._pool_id,
            Username=username,
        )
        attrs = {a["Name"]: a["Value"] for a in resp.get("UserAttributes", [])}
        groups = self._get_user_groups(username)
        return {
            "username": resp["Username"],
            "email": attrs.get("email", ""),
            "name": attrs.get("name", ""),
            "status": resp.get("UserStatus", ""),
            "enabled": resp.get("Enabled", True),
            "groups": groups,
            "created_at": resp.get("UserCreateDate", "").isoformat()
            if resp.get("UserCreateDate") else "",
        }

    def delete_user(self, username: str) -> None:
        """Delete a Cognito user."""
        self._cognito.admin_delete_user(
            UserPoolId=self._pool_id,
            Username=username,
        )
        logger.info("Cognito user deleted", extra={"username": username})

    def disable_user(self, username: str) -> None:
        """Disable a Cognito user."""
        self._cognito.admin_disable_user(
            UserPoolId=self._pool_id,
            Username=username,
        )
        logger.info("Cognito user disabled", extra={"username": username})

    def enable_user(self, username: str) -> None:
        """Enable a Cognito user."""
        self._cognito.admin_enable_user(
            UserPoolId=self._pool_id,
            Username=username,
        )
        logger.info("Cognito user enabled", extra={"username": username})

    def update_user_groups(self, username: str, groups: list[str]) -> None:
        """Set the user's groups, removing from old ones and adding new."""
        for g in groups:
            if g not in VALID_GROUPS:
                raise ValueError(f"Invalid group '{g}'")

        current = self._get_user_groups(username)

        for g in current:
            if g not in groups:
                self._cognito.admin_remove_user_from_group(
                    UserPoolId=self._pool_id,
                    Username=username,
                    GroupName=g,
                )

        for g in groups:
            if g not in current:
                self._cognito.admin_add_user_to_group(
                    UserPoolId=self._pool_id,
                    Username=username,
                    GroupName=g,
                )

        logger.info("User groups updated", extra={"username": username, "groups": groups})
