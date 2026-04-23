"""Cognito service — manage Cognito users for portal access."""

import secrets
import string

import boto3
from aws_lambda_powertools import Logger
from botocore.exceptions import ClientError

from src.config import get_settings

logger = Logger()


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

    def create_student_user(
        self,
        email: str,
        name: str,
    ) -> str:
        """Create a Cognito user for a student and add to the 'student' group.

        Args:
            email: Student email (used as username).
            name: Student display name.

        Returns:
            The temporary password assigned.

        Raises:
            ClientError: If Cognito API call fails (other than
            UsernameExistsException).
        """
        password = self.generate_password()

        try:
            self._cognito.admin_create_user(
                UserPoolId=self._pool_id,
                Username=email,
                UserAttributes=[
                    {"Name": "email", "Value": email},
                    {"Name": "email_verified", "Value": "true"},
                    {"Name": "name", "Value": name},
                ],
                MessageAction="SUPPRESS",
            )
            logger.info("Cognito user created", extra={"email": email})
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

        # Set permanent password (user will get NEW_PASSWORD_REQUIRED on first login)
        self._cognito.admin_set_user_password(
            UserPoolId=self._pool_id,
            Username=email,
            Password=password,
            Permanent=False,
        )

        # Add to student group
        self._cognito.admin_add_user_to_group(
            UserPoolId=self._pool_id,
            Username=email,
            GroupName="student",
        )
        logger.info(
            "Cognito user added to student group",
            extra={"email": email},
        )

        return password
