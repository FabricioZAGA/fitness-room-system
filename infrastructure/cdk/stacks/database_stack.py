"""DynamoDB Stack — Single-table design for Fitness Room System.

Table: fitness-room-{env}

Single-table design supporting all entities via composite keys.
Access patterns are documented in docs/architecture/database-design.md.
"""

import aws_cdk as cdk
from aws_cdk import aws_dynamodb as dynamodb
from constructs import Construct


class DatabaseStack(cdk.Stack):
    """Creates the DynamoDB table with all necessary GSIs for the Fitness Room System."""

    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        env_name: str,
        **kwargs: object,
    ) -> None:
        super().__init__(scope, construct_id, **kwargs)

        self.env_name = env_name
        is_prod = env_name == "prod"

        removal_policy = (
            cdk.RemovalPolicy.RETAIN if is_prod else cdk.RemovalPolicy.DESTROY
        )

        self.table = dynamodb.Table(
            self,
            "FitnessRoomTable",
            table_name=f"fitness-room-{env_name}",
            partition_key=dynamodb.Attribute(
                name="PK",
                type=dynamodb.AttributeType.STRING,
            ),
            sort_key=dynamodb.Attribute(
                name="SK",
                type=dynamodb.AttributeType.STRING,
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=removal_policy,
            point_in_time_recovery=is_prod,
            # Streams disabled — no active consumer. Re-enable when needed.
            time_to_live_attribute="TTL",
        )

        self.table.add_global_secondary_index(
            index_name="GSI1",
            partition_key=dynamodb.Attribute(
                name="GSI1PK",
                type=dynamodb.AttributeType.STRING,
            ),
            sort_key=dynamodb.Attribute(
                name="GSI1SK",
                type=dynamodb.AttributeType.STRING,
            ),
            projection_type=dynamodb.ProjectionType.ALL,
        )

        self.table.add_global_secondary_index(
            index_name="GSI2",
            partition_key=dynamodb.Attribute(
                name="GSI2PK",
                type=dynamodb.AttributeType.STRING,
            ),
            sort_key=dynamodb.Attribute(
                name="GSI2SK",
                type=dynamodb.AttributeType.STRING,
            ),
            projection_type=dynamodb.ProjectionType.ALL,
        )

        self.table.add_global_secondary_index(
            index_name="GSI3",
            partition_key=dynamodb.Attribute(
                name="GSI3PK",
                type=dynamodb.AttributeType.STRING,
            ),
            sort_key=dynamodb.Attribute(
                name="GSI3SK",
                type=dynamodb.AttributeType.STRING,
            ),
            projection_type=dynamodb.ProjectionType.ALL,
        )

        cdk.CfnOutput(
            self,
            "TableName",
            value=self.table.table_name,
            export_name=f"FitnessRoomTableName-{env_name}",
        )

        cdk.CfnOutput(
            self,
            "TableArn",
            value=self.table.table_arn,
            export_name=f"FitnessRoomTableArn-{env_name}",
        )
