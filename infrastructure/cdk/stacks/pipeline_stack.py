"""Pipeline Stack — S3 source + CodePipeline V2 + CodeBuild.

Creates a fully automated CI/CD pipeline that:
1. Triggers when a versioned zip is uploaded to the source S3 bucket
2. Builds backend (Lambda layer + function code)
3. Builds frontend + portal (npm build, sync to S3, invalidate CloudFront)
4. Deploys infrastructure changes via CDK

Release flow:
  Local: git tag v1.2.3 → make release
         → packages repo into zip → uploads to S3
         → CodePipeline detects new object → builds + deploys
"""

import aws_cdk as cdk
from aws_cdk import (
    aws_codebuild as codebuild,
    aws_codepipeline as codepipeline,
    aws_codepipeline_actions as actions,
    aws_cloudfront as cloudfront,
    aws_iam as iam,
    aws_lambda as lambda_,
    aws_s3 as s3,
)
from constructs import Construct


class PipelineStack(cdk.Stack):
    """CI/CD pipeline: S3 source → CodeBuild → deploy."""

    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        env_name: str,
        frontend_bucket: s3.Bucket,
        portal_bucket: s3.Bucket,
        frontend_distribution: cloudfront.Distribution,
        portal_distribution: cloudfront.Distribution,
        lambda_function: lambda_.Function,
        **kwargs: object,
    ) -> None:
        super().__init__(scope, construct_id, **kwargs)

        self.env_name = env_name

        # ── Source bucket ────────────────────────────────────────────────────
        self.source_bucket = s3.Bucket(
            self,
            "PipelineSourceBucket",
            bucket_name=f"fitness-room-pipeline-source-{self.account}",
            versioned=True,
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            encryption=s3.BucketEncryption.S3_MANAGED,
            removal_policy=cdk.RemovalPolicy.RETAIN,
            lifecycle_rules=[
                s3.LifecycleRule(
                    noncurrent_version_expiration=cdk.Duration.days(30),
                    id="DeleteOldSourceVersions",
                ),
            ],
        )

        # ── CodeBuild role ───────────────────────────────────────────────────
        build_role = iam.Role(
            self,
            "CodeBuildRole",
            assumed_by=iam.ServicePrincipal("codebuild.amazonaws.com"),
            managed_policies=[
                iam.ManagedPolicy.from_aws_managed_policy_name(
                    "AmazonS3FullAccess"
                ),
            ],
        )

        # CDK deploy permissions
        build_role.add_to_policy(
            iam.PolicyStatement(
                sid="CDKDeploy",
                effect=iam.Effect.ALLOW,
                actions=[
                    "cloudformation:*",
                    "lambda:*",
                    "apigateway:*",
                    "iam:*",
                    "cognito-idp:*",
                    "dynamodb:*",
                    "s3:*",
                    "cloudfront:*",
                    "events:*",
                    "ses:*",
                    "sns:*",
                    "logs:*",
                    "ssm:GetParameter",
                    "sts:AssumeRole",
                ],
                resources=["*"],
            )
        )

        # CloudFront invalidation
        build_role.add_to_policy(
            iam.PolicyStatement(
                sid="CloudFrontInvalidation",
                effect=iam.Effect.ALLOW,
                actions=["cloudfront:CreateInvalidation"],
                resources=[
                    f"arn:aws:cloudfront::{self.account}:distribution/{frontend_distribution.distribution_id}",
                    f"arn:aws:cloudfront::{self.account}:distribution/{portal_distribution.distribution_id}",
                ],
            )
        )

        # Lambda update
        build_role.add_to_policy(
            iam.PolicyStatement(
                sid="LambdaUpdate",
                effect=iam.Effect.ALLOW,
                actions=[
                    "lambda:UpdateFunctionCode",
                    "lambda:UpdateFunctionConfiguration",
                    "lambda:PublishLayerVersion",
                ],
                resources=[
                    lambda_function.function_arn,
                    f"arn:aws:lambda:{self.region}:{self.account}:layer:*",
                ],
            )
        )

        # ── Build project: Backend + CDK ─────────────────────────────────────
        backend_build = codebuild.PipelineProject(
            self,
            "BackendBuild",
            project_name=f"fitness-room-backend-build-{env_name}",
            build_spec=codebuild.BuildSpec.from_source_filename(
                "infrastructure/buildspec-backend.yml"
            ),
            environment=codebuild.BuildEnvironment(
                build_image=codebuild.LinuxBuildImage.STANDARD_7_0,
                compute_type=codebuild.ComputeType.SMALL,
                privileged=False,
            ),
            environment_variables={
                "ENV_NAME": codebuild.BuildEnvironmentVariable(value=env_name),
                "AWS_ACCOUNT_ID": codebuild.BuildEnvironmentVariable(value=self.account),
                "LAMBDA_FUNCTION_NAME": codebuild.BuildEnvironmentVariable(
                    value=lambda_function.function_name
                ),
            },
            role=build_role,
            timeout=cdk.Duration.minutes(15),
            description="Build backend Lambda + deploy CDK stacks",
        )

        # ── Build project: Frontend ──────────────────────────────────────────
        frontend_build = codebuild.PipelineProject(
            self,
            "FrontendBuild",
            project_name=f"fitness-room-frontend-build-{env_name}",
            build_spec=codebuild.BuildSpec.from_source_filename(
                "infrastructure/buildspec-frontend.yml"
            ),
            environment=codebuild.BuildEnvironment(
                build_image=codebuild.LinuxBuildImage.STANDARD_7_0,
                compute_type=codebuild.ComputeType.SMALL,
                privileged=False,
            ),
            environment_variables={
                "ENV_NAME": codebuild.BuildEnvironmentVariable(value=env_name),
                "FRONTEND_BUCKET": codebuild.BuildEnvironmentVariable(
                    value=frontend_bucket.bucket_name
                ),
                "PORTAL_BUCKET": codebuild.BuildEnvironmentVariable(
                    value=portal_bucket.bucket_name
                ),
                "FRONTEND_DISTRIBUTION_ID": codebuild.BuildEnvironmentVariable(
                    value=frontend_distribution.distribution_id
                ),
                "PORTAL_DISTRIBUTION_ID": codebuild.BuildEnvironmentVariable(
                    value=portal_distribution.distribution_id
                ),
            },
            role=build_role,
            timeout=cdk.Duration.minutes(15),
            description="Build frontend + portal, sync to S3, invalidate CloudFront",
        )

        # ── Pipeline ─────────────────────────────────────────────────────────
        source_output = codepipeline.Artifact("SourceOutput")

        source_action = actions.S3SourceAction(
            action_name="S3Source",
            bucket=self.source_bucket,
            bucket_key="fitness-room-source.zip",
            output=source_output,
            trigger=actions.S3Trigger.EVENTS,
        )

        backend_action = actions.CodeBuildAction(
            action_name="BuildBackend",
            project=backend_build,
            input=source_output,
        )

        frontend_action = actions.CodeBuildAction(
            action_name="BuildFrontend",
            project=frontend_build,
            input=source_output,
        )

        # Manual approval before deploy
        approve_action = actions.ManualApprovalAction(
            action_name="ApproveDeployment",
            additional_information="Review build artifacts before deploying to production.",
        )

        self.pipeline = codepipeline.Pipeline(
            self,
            "FitnessRoomPipeline",
            pipeline_name=f"fitness-room-{env_name}",
            pipeline_type=codepipeline.PipelineType.V2,
            restart_execution_on_update=False,
            stages=[
                codepipeline.StageProps(
                    stage_name="Source",
                    actions=[source_action],
                ),
                codepipeline.StageProps(
                    stage_name="Approve",
                    actions=[approve_action],
                ),
                codepipeline.StageProps(
                    stage_name="Build",
                    actions=[backend_action, frontend_action],
                ),
            ],
        )

        # ── Outputs ──────────────────────────────────────────────────────────
        cdk.CfnOutput(
            self,
            "SourceBucketName",
            value=self.source_bucket.bucket_name,
            export_name=f"FitnessRoomPipelineSourceBucket-{env_name}",
        )

        cdk.CfnOutput(
            self,
            "PipelineName",
            value=self.pipeline.pipeline_name,
            export_name=f"FitnessRoomPipelineName-{env_name}",
        )
