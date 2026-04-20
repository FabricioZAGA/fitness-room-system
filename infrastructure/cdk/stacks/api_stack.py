"""API Stack — Lambda + API Gateway v2 for Fitness Room System.

Creates:
- Lambda function running FastAPI via Mangum
- API Gateway v2 (HTTP API) with Cognito JWT authorizer
- Lambda execution role with DynamoDB + CloudWatch permissions
- Lambda layer for Python dependencies
"""

import aws_cdk as cdk
from aws_cdk import (
    aws_apigatewayv2 as apigwv2,
    aws_apigatewayv2_authorizers as apigwv2_authorizers,
    aws_apigatewayv2_integrations as apigwv2_integrations,
    aws_cognito as cognito,
    aws_dynamodb as dynamodb,
    aws_events as events,
    aws_events_targets as targets,
    aws_iam as iam,
    aws_lambda as lambda_,
    aws_logs as logs,
    aws_ses as ses,
)
from constructs import Construct


class ApiStack(cdk.Stack):
    """Creates Lambda function and API Gateway v2 HTTP API."""

    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        env_name: str,
        table: dynamodb.Table,
        user_pool: cognito.UserPool,
        user_pool_client_id: str = "",
        frontend_url: str = "http://localhost:5173",
        portal_url: str = "http://localhost:3001",
        sender_email: str = "noreply@fitness-room.mx",
        sender_name: str = "Fitness Room",
        **kwargs: object,
    ) -> None:
        super().__init__(scope, construct_id, **kwargs)

        self.env_name = env_name
        self.frontend_url = frontend_url
        self.portal_url = portal_url

        lambda_role = iam.Role(
            self,
            "LambdaExecutionRole",
            assumed_by=iam.ServicePrincipal("lambda.amazonaws.com"),
            managed_policies=[
                iam.ManagedPolicy.from_aws_managed_policy_name(
                    "service-role/AWSLambdaBasicExecutionRole"
                ),
                iam.ManagedPolicy.from_aws_managed_policy_name(
                    "AWSXRayDaemonWriteAccess"
                ),
            ],
        )

        table.grant_read_write_data(lambda_role)

        # SES — allow the Lambda to send emails
        lambda_role.add_to_policy(
            iam.PolicyStatement(
                sid="AllowSESSendEmail",
                effect=iam.Effect.ALLOW,
                actions=["ses:SendEmail", "ses:SendRawEmail"],
                resources=["*"],
            )
        )

        # SNS — allow the Lambda to send SMS
        lambda_role.add_to_policy(
            iam.PolicyStatement(
                sid="AllowSNSSendSMS",
                effect=iam.Effect.ALLOW,
                actions=["sns:Publish"],
                resources=["*"],
            )
        )

        # Cognito — allow listing users (for admin email retrieval)
        lambda_role.add_to_policy(
            iam.PolicyStatement(
                sid="AllowCognitoListUsers",
                effect=iam.Effect.ALLOW,
                actions=[
                    "cognito-idp:ListUsers",
                    "cognito-idp:ListUsersInGroup",
                    "cognito-idp:AdminCreateUser",
                    "cognito-idp:AdminAddUserToGroup",
                    "cognito-idp:AdminSetUserPassword",
                ],
                resources=[user_pool.user_pool_arn],
            )
        )

        dependencies_layer = lambda_.LayerVersion(
            self,
            "DependenciesLayer",
            layer_version_name=f"fitness-room-deps-{env_name}",
            code=lambda_.Code.from_asset(
                "../../backend",
                bundling=cdk.BundlingOptions(
                    image=lambda_.Runtime.PYTHON_3_12.bundling_image,
                    platform="linux/amd64",
                    command=[
                        "bash",
                        "-c",
                        "pip install -r requirements.txt "
                        "-t /asset-output/python && "
                        "find /asset-output -name '*.pyc' -delete && "
                        "find /asset-output -name '__pycache__' -type d -exec rm -rf {} + 2>/dev/null || true",
                    ],
                ),
            ),
            compatible_runtimes=[lambda_.Runtime.PYTHON_3_12],
            compatible_architectures=[lambda_.Architecture.X86_64],
            description="Fitness Room Python dependencies",
        )

        self.api_function = lambda_.Function(
            self,
            "ApiFunction",
            function_name=f"fitness-room-api-{env_name}",
            runtime=lambda_.Runtime.PYTHON_3_12,
            code=lambda_.Code.from_asset(
                "../../backend",
                bundling=cdk.BundlingOptions(
                    image=lambda_.Runtime.PYTHON_3_12.bundling_image,
                    command=[
                        "bash",
                        "-c",
                        "cp -r src /asset-output/src && "
                        "cp src/main.py /asset-output/main.py",
                    ],
                ),
            ),
            handler="main.handler",
            architecture=lambda_.Architecture.X86_64,
            role=lambda_role,
            layers=[dependencies_layer],
            timeout=cdk.Duration.seconds(30),
            memory_size=512,
            environment={
                "ENVIRONMENT": env_name,
                "DYNAMODB_TABLE_NAME": table.table_name,
                "AWS_REGION_NAME": self.region,
                "LOG_LEVEL": "INFO" if env_name == "prod" else "DEBUG",
                "POWERTOOLS_SERVICE_NAME": "fitness-room-api",
                "POWERTOOLS_METRICS_NAMESPACE": "FitnessRoom",
                "POWERTOOLS_LOG_LEVEL": "INFO" if env_name == "prod" else "DEBUG",
                "FRONTEND_URL": frontend_url,
                "PORTAL_URL": portal_url,
                "SES_SENDER_EMAIL": sender_email,
                "SES_SENDER_NAME": sender_name,
            },
            tracing=lambda_.Tracing.ACTIVE,
            log_retention=logs.RetentionDays.ONE_MONTH if env_name == "prod" else logs.RetentionDays.ONE_WEEK,
        )

        _audience = user_pool_client_id if user_pool_client_id else user_pool.user_pool_id
        jwt_authorizer = apigwv2_authorizers.HttpJwtAuthorizer(
            "CognitoAuthorizer",
            jwt_issuer=f"https://cognito-idp.{self.region}.amazonaws.com/{user_pool.user_pool_id}",
            jwt_audience=[_audience],
            identity_source=["$request.header.Authorization"],
        )

        lambda_integration = apigwv2_integrations.HttpLambdaIntegration(
            "LambdaIntegration",
            self.api_function,
        )

        self.http_api = apigwv2.HttpApi(
            self,
            "FitnessRoomHttpApi",
            api_name=f"fitness-room-api-{env_name}",
            description="Fitness Room System REST API",
            cors_preflight=apigwv2.CorsPreflightOptions(
                allow_origins=self._get_allowed_origins(env_name),
                allow_methods=[
                    apigwv2.CorsHttpMethod.GET,
                    apigwv2.CorsHttpMethod.POST,
                    apigwv2.CorsHttpMethod.PUT,
                    apigwv2.CorsHttpMethod.PATCH,
                    apigwv2.CorsHttpMethod.DELETE,
                    apigwv2.CorsHttpMethod.OPTIONS,
                ],
                allow_headers=["Content-Type", "Authorization", "X-Api-Key"],
                max_age=cdk.Duration.hours(1),
            ),
        )

        self.http_api.add_routes(
            path="/health",
            methods=[apigwv2.HttpMethod.GET],
            integration=lambda_integration,
        )

        for method in [
            apigwv2.HttpMethod.GET,
            apigwv2.HttpMethod.POST,
            apigwv2.HttpMethod.PUT,
            apigwv2.HttpMethod.PATCH,
            apigwv2.HttpMethod.DELETE,
        ]:
            self.http_api.add_routes(
                path="/{proxy+}",
                methods=[method],
                integration=lambda_integration,
                authorizer=jwt_authorizer,
            )

        # ── SES email identity ─────────────────────────────────────────────────
        # Verifies the sender email address with SES.
        # NOTE: After deploy, check the inbox of sender_email and click the
        # verification link before emails can be sent.
        ses.CfnEmailIdentity(
            self,
            "SenderEmailIdentity",
            email_identity=sender_email,
        )

        # ── EventBridge daily notification schedule ────────────────────────────
        # Fires every day at 09:00 CDMX (15:00 UTC, UTC-6)
        notification_rule = events.Rule(
            self,
            "DailyNotificationRule",
            rule_name=f"fitness-room-daily-notifications-{env_name}",
            description="Trigger daily membership expiry and inactivity email notifications",
            schedule=events.Schedule.cron(
                hour="15",
                minute="0",
                week_day="*",
                month="*",
                year="*",
            ),
            enabled=env_name != "dev",  # disabled in dev to avoid accidental emails
        )
        notification_rule.add_target(
            targets.LambdaFunction(
                self.api_function,
                event=events.RuleTargetInput.from_object(
                    {
                        "source": "aws.events",
                        "detail-type": "Scheduled Event",
                        "detail": {"action": "send_all"},
                    }
                ),
            )
        )

        cdk.CfnOutput(
            self,
            "ApiUrl",
            value=self.http_api.api_endpoint,
            export_name=f"FitnessRoomApiUrl-{env_name}",
        )

        cdk.CfnOutput(
            self,
            "ApiId",
            value=self.http_api.api_id,
            export_name=f"FitnessRoomApiId-{env_name}",
        )

        cdk.CfnOutput(
            self,
            "LambdaFunctionName",
            value=self.api_function.function_name,
            export_name=f"FitnessRoomLambdaFunctionName-{env_name}",
        )

    def _get_allowed_origins(self, env_name: str) -> list[str]:
        """Return CORS allowed origins per environment."""
        origins = [
            "http://localhost:5173",   # frontend admin (Vite)
            "http://localhost:3000",   # landing (Next.js)
            "http://localhost:3001",   # portal (Vite)
        ]
        if self.frontend_url and self.frontend_url.startswith("https"):
            origins.append(self.frontend_url)
        if self.portal_url and self.portal_url.startswith("https"):
            origins.append(self.portal_url)
        return origins
