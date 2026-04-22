"""Application configuration loaded from environment variables.

Uses pydantic-settings to validate and parse all configuration.
Never hardcode secrets — always use environment variables or AWS Secrets Manager.
"""

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    environment: str = Field(default="local", description="Deployment environment")
    log_level: str = Field(default="INFO", description="Logging level")

    aws_region: str = Field(default="us-east-1", description="AWS region")
    aws_account_id: str = Field(default="948999370306", description="AWS account ID")

    dynamodb_table_name: str = Field(..., description="DynamoDB table name")
    dynamodb_endpoint_url: str | None = Field(
        default=None,
        description="DynamoDB endpoint URL (for local development only)",
    )

    cognito_user_pool_id: str = Field(default="", description="Cognito User Pool ID")
    cognito_client_id: str = Field(default="", description="Cognito App Client ID")
    cognito_region: str = Field(default="us-east-1", description="Cognito region")
    frontend_url: str = Field(
        default="http://localhost:5173",
        description="Frontend URL for CORS allowed origins",
    )
    portal_url: str = Field(
        default="http://localhost:3001",
        description="Portal URL for CORS allowed origins",
    )

    powertools_service_name: str = Field(
        default="fitness-room-api", description="Lambda Powertools service name"
    )

    # ── SES / Notifications ────────────────────────────────────────────────────
    ses_sender_email: str = Field(
        default="noreply@fitnessroom.mx",
        description="Verified SES sender email address",
    )
    ses_sender_name: str = Field(
        default="Fitness Room",
        description="Display name in the From field of notification emails",
    )
    gym_phone: str = Field(
        default="",
        description="Gym phone number shown in email footers",
    )
    notification_critical_days: int = Field(
        default=7,
        description="Days before expiry for critical (urgent) reminder",
    )
    notification_warning_days: int = Field(
        default=30,
        description="Days before expiry for standard reminder",
    )
    notification_inactive_days: int = Field(
        default=14,
        description="Days without check-in before inactivity alert",
    )

    # ── S3 / Media ──────────────────────────────────────────────────────────────
    s3_media_bucket: str = Field(
        default="fitness-room-media-local",
        description="S3 bucket for media uploads (student photos, product images)",
    )

    # ── SNS / SMS ───────────────────────────────────────────────────────────────
    sms_enabled: bool = Field(
        default=False,
        description="Enable SMS notifications via AWS SNS",
    )
    sms_sender_id: str = Field(
        default="FitnessRoom",
        description="SMS sender ID (alphanumeric, max 11 chars)",
    )

    @property
    def cognito_jwks_url(self) -> str:
        """Return JWKS URL for Cognito token validation."""
        return (
            f"https://cognito-idp.{self.cognito_region}.amazonaws.com"
            f"/{self.cognito_user_pool_id}/.well-known/jwks.json"
        )

    @property
    def is_local(self) -> bool:
        """Return True if running in local development mode."""
        return self.environment == "local"

    @property
    def is_prod(self) -> bool:
        """Return True if running in production environment."""
        return self.environment == "prod"


@lru_cache
def get_settings() -> Settings:
    """Return cached application settings instance."""
    return Settings()  # type: ignore[call-arg]
