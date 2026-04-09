#!/usr/bin/env python3
"""Fitness Room System — AWS CDK Application Entry Point.

This file defines all CloudFormation stacks and their dependency order.
Stacks are organized by domain to allow independent deployments.

Deployment order:
  1. DatabaseStack        (DynamoDB)
  2. AuthStack            (Cognito)
  3. ApiStack             (Lambda + API Gateway)
  4. HostingStack         (S3 + CloudFront for admin frontend)
  5. PortalHostingStack   (S3 + CloudFront for student portal)
"""

import aws_cdk as cdk

from stacks.auth_stack import AuthStack
from stacks.database_stack import DatabaseStack
from stacks.api_stack import ApiStack
from stacks.hosting_stack import HostingStack
from stacks.portal_hosting_stack import PortalHostingStack

app = cdk.App()

env_name: str = app.node.try_get_context("env") or "dev"

aws_env = cdk.Environment(
    account="948999370306",
    region="us-east-1",
)

common_tags = {
    "Project": "fitness-room",
    "Environment": env_name,
    "ManagedBy": "cdk",
    "Owner": "FabricioZAGA",
}

database_stack = DatabaseStack(
    app,
    f"FitnessRoomDatabaseStack-{env_name}",
    env_name=env_name,
    env=aws_env,
    tags=common_tags,
)

auth_stack = AuthStack(
    app,
    f"FitnessRoomAuthStack-{env_name}",
    env_name=env_name,
    env=aws_env,
    tags=common_tags,
)

_sender_email: str = app.node.try_get_context("senderEmail") or "noreply@fitness-room.mx"
_sender_name: str = app.node.try_get_context("senderName") or "Fitness Room"

api_stack = ApiStack(
    app,
    f"FitnessRoomApiStack-{env_name}",
    env_name=env_name,
    table=database_stack.table,
    user_pool=auth_stack.user_pool,
    frontend_url="http://localhost:5173" if env_name == "dev" else "https://app.fitnessroom.com" if env_name == "prod" else "https://staging.fitnessroom.com",
    sender_email=_sender_email,
    sender_name=_sender_name,
    env=aws_env,
    tags=common_tags,
)
api_stack.add_dependency(database_stack)
api_stack.add_dependency(auth_stack)

hosting_stack = HostingStack(
    app,
    f"FitnessRoomHostingStack-{env_name}",
    env_name=env_name,
    env=aws_env,
    tags=common_tags,
)

portal_hosting_stack = PortalHostingStack(
    app,
    f"FitnessRoomPortalHostingStack-{env_name}",
    env_name=env_name,
    env=aws_env,
    tags=common_tags,
)

app.synth()
