"""Auth Stack — AWS Cognito User Pool for Fitness Room System.

Provides:
- Cognito User Pool (admin-managed users, no self-signup)
- User Pool Client (for frontend SPA)
- Admin group for studio administrators
- Staff group for instructors
- Student group for student portal access

Outputs exported for use by ApiStack and frontend config.
"""

import aws_cdk as cdk
from aws_cdk import aws_cognito as cognito
from constructs import Construct


class AuthStack(cdk.Stack):
    """Creates Cognito User Pool and App Client for the Fitness Room System."""

    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        env_name: str,
        domain: str = "",
        admin_subdomain: str = "admin",
        portal_subdomain: str = "portal",
        admin_cloudfront_url: str = "",
        portal_cloudfront_url: str = "",
        ses_sender_email: str = "noreply@fitnessroom.mx",
        ses_sender_name: str = "Fitness Room",
        **kwargs: object,
    ) -> None:
        super().__init__(scope, construct_id, **kwargs)

        self.env_name = env_name
        self.domain = domain
        self.admin_subdomain = admin_subdomain
        self.portal_subdomain = portal_subdomain
        self.admin_cloudfront_url = admin_cloudfront_url
        self.portal_cloudfront_url = portal_cloudfront_url
        is_prod = env_name == "prod"

        self.user_pool = cognito.UserPool(
            self,
            "FitnessRoomUserPool",
            user_pool_name=f"fitness-room-{env_name}",
            self_sign_up_enabled=False,
            sign_in_aliases=cognito.SignInAliases(
                email=True,
                username=False,
            ),
            auto_verify=cognito.AutoVerifiedAttrs(email=True),
            standard_attributes=cognito.StandardAttributes(
                email=cognito.StandardAttribute(required=True, mutable=True),
                given_name=cognito.StandardAttribute(required=True, mutable=True),
                family_name=cognito.StandardAttribute(required=True, mutable=True),
                phone_number=cognito.StandardAttribute(required=False, mutable=True),
            ),
            custom_attributes={
                "role": cognito.StringAttribute(mutable=True),
            },
            password_policy=cognito.PasswordPolicy(
                min_length=8,
                require_lowercase=True,
                require_uppercase=True,
                require_digits=True,
                require_symbols=False,
            ),
            account_recovery=cognito.AccountRecovery.EMAIL_ONLY,
            removal_policy=(
                cdk.RemovalPolicy.RETAIN if is_prod else cdk.RemovalPolicy.DESTROY
            ),
            email=cognito.UserPoolEmail.with_ses(
                from_email=ses_sender_email,
                from_name=ses_sender_name,
                ses_region="us-west-2",
                ses_verified_domain=domain or "fitnessroom.mx",
            ),
            mfa=cognito.Mfa.OPTIONAL,
            mfa_second_factor=cognito.MfaSecondFactor(
                sms=False,
                otp=True,
            ),
        )

        self.user_pool_client = self.user_pool.add_client(
            "FitnessRoomWebClient",
            user_pool_client_name=f"fitness-room-web-{env_name}",
            auth_flows=cognito.AuthFlow(
                user_password=True,
                user_srp=True,
            ),
            o_auth=cognito.OAuthSettings(
                flows=cognito.OAuthFlows(
                    authorization_code_grant=True,
                ),
                scopes=[
                    cognito.OAuthScope.OPENID,
                    cognito.OAuthScope.EMAIL,
                    cognito.OAuthScope.PROFILE,
                ],
                callback_urls=self._get_callback_urls(env_name),
                logout_urls=self._get_logout_urls(env_name),
            ),
            access_token_validity=cdk.Duration.hours(1),
            id_token_validity=cdk.Duration.hours(1),
            refresh_token_validity=cdk.Duration.days(30),
            prevent_user_existence_errors=True,
            generate_secret=False,
        )

        cognito.CfnUserPoolGroup(
            self,
            "AdminGroup",
            user_pool_id=self.user_pool.user_pool_id,
            group_name="admin",
            description="Studio administrators — full access",
            precedence=1,
        )

        cognito.CfnUserPoolGroup(
            self,
            "ReceptionistGroup",
            user_pool_id=self.user_pool.user_pool_id,
            group_name="receptionist",
            description="Receptionists — admin panel with limited access",
            precedence=2,
        )

        cognito.CfnUserPoolGroup(
            self,
            "StaffGroup",
            user_pool_id=self.user_pool.user_pool_id,
            group_name="staff",
            description="Instructors and staff — portal access",
            precedence=3,
        )

        cognito.CfnUserPoolGroup(
            self,
            "StudentGroup",
            user_pool_id=self.user_pool.user_pool_id,
            group_name="student",
            description="Students — portal access only",
            precedence=4,
        )

        cdk.CfnOutput(
            self,
            "UserPoolId",
            value=self.user_pool.user_pool_id,
            export_name=f"FitnessRoomUserPoolId-{env_name}",
        )

        cdk.CfnOutput(
            self,
            "UserPoolClientId",
            value=self.user_pool_client.user_pool_client_id,
            export_name=f"FitnessRoomUserPoolClientId-{env_name}",
        )

        cdk.CfnOutput(
            self,
            "UserPoolArn",
            value=self.user_pool.user_pool_arn,
            export_name=f"FitnessRoomUserPoolArn-{env_name}",
        )

    def _get_callback_urls(self, env_name: str) -> list[str]:
        """Return OAuth callback URLs based on environment."""
        urls = [
            "http://localhost:5173/auth/callback",
            "http://localhost:3001/auth/callback",
        ]
        if self.domain:
            urls.append(f"https://{self.admin_subdomain}.{self.domain}/auth/callback")
            urls.append(f"https://{self.portal_subdomain}.{self.domain}/auth/callback")
        if self.admin_cloudfront_url:
            urls.append(f"{self.admin_cloudfront_url}/auth/callback")
        if self.portal_cloudfront_url:
            urls.append(f"{self.portal_cloudfront_url}/auth/callback")
        return urls

    def _get_logout_urls(self, env_name: str) -> list[str]:
        """Return OAuth logout URLs based on environment."""
        urls = [
            "http://localhost:5173/auth/logout",
            "http://localhost:3001/auth/logout",
        ]
        if self.domain:
            urls.append(f"https://{self.admin_subdomain}.{self.domain}/auth/logout")
            urls.append(f"https://{self.portal_subdomain}.{self.domain}/auth/logout")
        if self.admin_cloudfront_url:
            urls.append(f"{self.admin_cloudfront_url}/auth/logout")
        if self.portal_cloudfront_url:
            urls.append(f"{self.portal_cloudfront_url}/auth/logout")
        return urls
