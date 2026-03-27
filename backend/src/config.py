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

    powertools_service_name: str = Field(
        default="fitness-room-api", description="Lambda Powertools service name"
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
