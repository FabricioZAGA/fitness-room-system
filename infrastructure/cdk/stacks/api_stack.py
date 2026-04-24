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
    aws_s3 as s3,
    aws_ses as ses,
    aws_sns as sns,
    aws_sns_subscriptions as sns_subs,
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
        alert_email: str = "devzaga@gmail.com",
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

        # ── S3 media bucket (student photos, product images) ──────────────
        is_prod = env_name == "prod"
        self.media_bucket = s3.Bucket(
            self,
            "MediaBucket",
            bucket_name=f"fitness-room-media-{env_name}-{self.account}",
            block_public_access=s3.BlockPublicAccess(
                block_public_acls=True,
                ignore_public_acls=True,
                block_public_policy=False,
                restrict_public_buckets=False,
            ),
            encryption=s3.BucketEncryption.S3_MANAGED,
            removal_policy=(
                cdk.RemovalPolicy.RETAIN if is_prod else cdk.RemovalPolicy.DESTROY
            ),
            auto_delete_objects=not is_prod,
            cors=[
                s3.CorsRule(
                    allowed_methods=[s3.HttpMethods.GET, s3.HttpMethods.PUT],
                    allowed_origins=[
                        "https://admin.fitnessroom.mx",
                        "https://portal.fitnessroom.mx",
                        *([
                            "http://localhost:5173",
                            "http://localhost:3001",
                        ] if env_name != "prod" else []),
                    ],
                    allowed_headers=["Content-Type", "x-amz-acl"],
                    max_age=3600,
                ),
            ],
        )
        self.media_bucket.grant_read_write(lambda_role)

        # SES — allow the Lambda to send emails (scoped to domain identity)
        ses_region = "us-west-2"
        lambda_role.add_to_policy(
            iam.PolicyStatement(
                sid="AllowSESSendEmail",
                effect=iam.Effect.ALLOW,
                actions=["ses:SendEmail", "ses:SendRawEmail"],
                resources=[
                    f"arn:aws:ses:{ses_region}:{self.account}:identity/fitnessroom.mx",
                    f"arn:aws:ses:{ses_region}:{self.account}:configuration-set/*",
                ],
            )
        )
        # SES — suppression list management (account-level actions).
        # Needed so the API can pre-check for suppressed recipients and surface
        # real delivery failures to admins instead of silently dropping messages.
        lambda_role.add_to_policy(
            iam.PolicyStatement(
                sid="AllowSESSuppressionList",
                effect=iam.Effect.ALLOW,
                actions=[
                    "ses:GetSuppressedDestination",
                    "ses:ListSuppressedDestinations",
                    "ses:PutSuppressedDestination",
                    "ses:DeleteSuppressedDestination",
                ],
                resources=["*"],
            )
        )

        # SNS — allow the Lambda to send SMS (scoped to region)
        lambda_role.add_to_policy(
            iam.PolicyStatement(
                sid="AllowSNSSendSMS",
                effect=iam.Effect.ALLOW,
                actions=["sns:Publish"],
                resources=[
                    f"arn:aws:sns:{self.region}:{self.account}:*",
                ],
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
                    "cognito-idp:AdminGetUser",
                    "cognito-idp:AdminDeleteUser",
                    "cognito-idp:AdminDisableUser",
                    "cognito-idp:AdminEnableUser",
                    "cognito-idp:AdminRemoveUserFromGroup",
                    "cognito-idp:AdminListGroupsForUser",
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
                    platform="linux/arm64",
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
            compatible_architectures=[lambda_.Architecture.ARM_64],
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
            architecture=lambda_.Architecture.ARM_64,
            role=lambda_role,
            layers=[dependencies_layer],
            timeout=cdk.Duration.seconds(60),
            memory_size=1024,
            environment={
                "ENVIRONMENT": env_name,
                "DYNAMODB_TABLE_NAME": table.table_name,
                "AWS_REGION_NAME": self.region,
                "LOG_LEVEL": "INFO" if env_name == "prod" else "DEBUG",
                "POWERTOOLS_SERVICE_NAME": "fitness-room-api",
                "POWERTOOLS_METRICS_NAMESPACE": "FitnessRoom",
                "POWERTOOLS_LOG_LEVEL": "INFO" if env_name == "prod" else "DEBUG",
                "COGNITO_USER_POOL_ID": user_pool.user_pool_id,
                "COGNITO_CLIENT_ID": user_pool_client_id,
                "COGNITO_REGION": self.region,
                "FRONTEND_URL": frontend_url,
                "PORTAL_URL": portal_url,
                "S3_MEDIA_BUCKET": self.media_bucket.bucket_name,
                "SES_SENDER_EMAIL": sender_email,
                "SES_SENDER_NAME": sender_name,
                "SES_CONFIGURATION_SET": f"fitness-room-{env_name}",
            },
            tracing=lambda_.Tracing.PASS_THROUGH,
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

        # ── Throttling on the auto-created $default stage ─────────────────────
        # Without this, the API has no protection against DoS/abuse. Limits are
        # conservative: 20 req/sec sustained (~1.7M/day) with 50 burst headroom
        # for normal UI bursts (dashboard load fires ~8 parallel queries).
        # Raise if real traffic requires more.
        #
        # ApiGatewayManagedOverrides only works for quick-create APIs, so we
        # instead add a CFN property override on the L2-auto-created stage's
        # underlying CfnStage.
        if self.http_api.default_stage is not None:
            cfn_stage = self.http_api.default_stage.node.default_child
            cfn_stage.add_property_override(  # type: ignore[attr-defined]
                "DefaultRouteSettings",
                {
                    "ThrottlingBurstLimit": 50,
                    "ThrottlingRateLimit": 20,
                },
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

        # ── SES Configuration Set + bounce/complaint alerting ──────────────────
        # Every outbound email carries `ConfigurationSetName` so SES routes
        # feedback (bounce/complaint/reject/delivery-delay/rendering-failure)
        # events to an SNS topic. The topic is email-subscribed to `alert_email`
        # so a real person is paged the moment delivery breaks — instead of
        # discovering it days later when a user reports "no me llegó el correo".
        self.email_alerts_topic = sns.Topic(
            self,
            "EmailDeliveryAlertsTopic",
            topic_name=f"fitness-room-email-events-{env_name}",
            display_name=f"Fitness Room ({env_name}) email delivery events",
        )
        self.email_alerts_topic.add_subscription(
            sns_subs.EmailSubscription(alert_email),
        )

        # Allow SES (in this account) to publish feedback events to the topic.
        self.email_alerts_topic.add_to_resource_policy(
            iam.PolicyStatement(
                sid="AllowSESPublish",
                effect=iam.Effect.ALLOW,
                principals=[iam.ServicePrincipal("ses.amazonaws.com")],
                actions=["SNS:Publish"],
                resources=[self.email_alerts_topic.topic_arn],
                conditions={"StringEquals": {"AWS:SourceAccount": self.account}},
            )
        )

        config_set_name = f"fitness-room-{env_name}"
        config_set = ses.CfnConfigurationSet(
            self,
            "EmailConfigSet",
            name=config_set_name,
            reputation_options=ses.CfnConfigurationSet.ReputationOptionsProperty(
                reputation_metrics_enabled=True,
            ),
            sending_options=ses.CfnConfigurationSet.SendingOptionsProperty(
                sending_enabled=True,
            ),
            suppression_options=ses.CfnConfigurationSet.SuppressionOptionsProperty(
                # Continue auto-suppressing hard bounces and complaints account-wide.
                suppressed_reasons=["BOUNCE", "COMPLAINT"],
            ),
        )

        event_dest = ses.CfnConfigurationSetEventDestination(
            self,
            "EmailConfigSetEventDest",
            configuration_set_name=config_set_name,
            event_destination=ses.CfnConfigurationSetEventDestination.EventDestinationProperty(
                enabled=True,
                matching_event_types=[
                    "bounce",
                    "complaint",
                    "reject",
                    "renderingFailure",
                    "deliveryDelay",
                ],
                sns_destination=ses.CfnConfigurationSetEventDestination.SnsDestinationProperty(
                    topic_arn=self.email_alerts_topic.topic_arn,
                ),
            ),
        )
        # Event destination must be created after the config set it references.
        event_dest.add_dependency(config_set)

        cdk.CfnOutput(
            self,
            "EmailAlertsTopicArn",
            value=self.email_alerts_topic.topic_arn,
            export_name=f"FitnessRoomEmailAlertsTopicArn-{env_name}",
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
