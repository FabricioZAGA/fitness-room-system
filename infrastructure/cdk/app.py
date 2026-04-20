#!/usr/bin/env python3
"""Fitness Room System — AWS CDK Application Entry Point.

Production-only deployment.  All configuration lives in cdk.json context.

Deployment order:
  1. DatabaseStack        (DynamoDB)
  2. AuthStack            (Cognito)
  3. ApiStack             (Lambda + API Gateway)
  4. HostingStack         (S3 + CloudFront — admin frontend)
  5. PortalHostingStack   (S3 + CloudFront — student portal)
  6. PipelineStack        (S3 source + CodePipeline V2 + CodeBuild)
"""

import aws_cdk as cdk

from stacks.api_stack import ApiStack
from stacks.auth_stack import AuthStack
from stacks.database_stack import DatabaseStack
from stacks.hosting_stack import HostingStack
from stacks.pipeline_stack import PipelineStack
from stacks.portal_hosting_stack import PortalHostingStack

app = cdk.App()

# ── Configuration (from cdk.json context) ────────────────────────────────────

ENV_NAME = "prod"

domain: str = app.node.try_get_context("domain") or ""
admin_subdomain: str = app.node.try_get_context("adminSubdomain") or "app"
portal_subdomain: str = app.node.try_get_context("portalSubdomain") or "portal"
api_subdomain: str = app.node.try_get_context("apiSubdomain") or "api"
sender_email: str = app.node.try_get_context("senderEmail") or "noreply@fitness-room.mx"
sender_name: str = app.node.try_get_context("senderName") or "Fitness Room"
project_name: str = app.node.try_get_context("projectName") or "fitness-room"

# Compute URLs — use CloudFront if no domain configured
if domain:
    admin_url = f"https://{admin_subdomain}.{domain}"
    portal_url = f"https://{portal_subdomain}.{domain}"
    api_custom_domain = f"{api_subdomain}.{domain}"
else:
    admin_url = ""   # resolved after deploy via CloudFront URL
    portal_url = ""
    api_custom_domain = ""

aws_env = cdk.Environment(
    account="948999370306",
    region="us-west-2",
)

common_tags = {
    "Project": project_name,
    "Environment": ENV_NAME,
    "ManagedBy": "cdk",
    "Owner": "FabricioZAGA",
}

# ── Stacks ───────────────────────────────────────────────────────────────────

database_stack = DatabaseStack(
    app,
    f"FitnessRoomDatabaseStack-{ENV_NAME}",
    env_name=ENV_NAME,
    env=aws_env,
    tags=common_tags,
)

auth_stack = AuthStack(
    app,
    f"FitnessRoomAuthStack-{ENV_NAME}",
    env_name=ENV_NAME,
    domain=domain,
    admin_subdomain=admin_subdomain,
    portal_subdomain=portal_subdomain,
    env=aws_env,
    tags=common_tags,
)

hosting_stack = HostingStack(
    app,
    f"FitnessRoomHostingStack-{ENV_NAME}",
    env_name=ENV_NAME,
    domain=domain,
    subdomain=admin_subdomain,
    env=aws_env,
    tags=common_tags,
)

portal_hosting_stack = PortalHostingStack(
    app,
    f"FitnessRoomPortalHostingStack-{ENV_NAME}",
    env_name=ENV_NAME,
    domain=domain,
    subdomain=portal_subdomain,
    env=aws_env,
    tags=common_tags,
)

# Resolve frontend URL from CloudFront if no custom domain
_frontend_url = admin_url or f"https://{hosting_stack.distribution.distribution_domain_name}"
_portal_url = portal_url or f"https://{portal_hosting_stack.distribution.distribution_domain_name}"

api_stack = ApiStack(
    app,
    f"FitnessRoomApiStack-{ENV_NAME}",
    env_name=ENV_NAME,
    table=database_stack.table,
    user_pool=auth_stack.user_pool,
    frontend_url=_frontend_url,
    portal_url=_portal_url,
    sender_email=sender_email,
    sender_name=sender_name,
    env=aws_env,
    tags=common_tags,
)
api_stack.add_dependency(database_stack)
api_stack.add_dependency(auth_stack)

# ── CI/CD Pipeline ───────────────────────────────────────────────────────────

pipeline_stack = PipelineStack(
    app,
    f"FitnessRoomPipelineStack-{ENV_NAME}",
    env_name=ENV_NAME,
    frontend_bucket=hosting_stack.frontend_bucket,
    portal_bucket=portal_hosting_stack.portal_bucket,
    frontend_distribution=hosting_stack.distribution,
    portal_distribution=portal_hosting_stack.distribution,
    lambda_function=api_stack.api_function,
    env=aws_env,
    tags=common_tags,
)

app.synth()
