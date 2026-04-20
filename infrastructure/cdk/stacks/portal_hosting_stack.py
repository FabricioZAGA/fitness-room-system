"""Portal Hosting Stack — S3 + CloudFront for Student Portal.

Creates:
- S3 bucket (private, CloudFront-only access)
- CloudFront distribution with Origin Access Control
- Cache behaviors optimized for SPA routing
"""

import aws_cdk as cdk
from aws_cdk import (
    aws_cloudfront as cloudfront,
    aws_cloudfront_origins as origins,
    aws_s3 as s3,
)
from constructs import Construct


class PortalHostingStack(cdk.Stack):
    """Creates S3 bucket and CloudFront distribution for the student portal."""

    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        env_name: str,
        domain: str = "",
        subdomain: str = "portal",
        **kwargs: object,
    ) -> None:
        super().__init__(scope, construct_id, **kwargs)

        self.env_name = env_name
        self.domain = domain
        self.subdomain = subdomain
        is_prod = env_name == "prod"

        self.portal_bucket = s3.Bucket(
            self,
            "PortalBucket",
            bucket_name=f"fitness-room-portal-{env_name}-{self.account}",
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            encryption=s3.BucketEncryption.S3_MANAGED,
            removal_policy=(
                cdk.RemovalPolicy.RETAIN if is_prod else cdk.RemovalPolicy.DESTROY
            ),
            auto_delete_objects=not is_prod,
            versioned=is_prod,
        )

        oac = cloudfront.S3OriginAccessControl(
            self,
            "PortalOAC",
            description=f"OAC for Fitness Room student portal ({env_name})",
        )

        s3_origin = origins.S3BucketOrigin.with_origin_access_control(
            self.portal_bucket,
            origin_access_control=oac,
        )

        self.distribution = cloudfront.Distribution(
            self,
            "PortalDistribution",
            comment=f"Fitness Room Student Portal ({env_name})",
            default_root_object="index.html",
            default_behavior=cloudfront.BehaviorOptions(
                origin=s3_origin,
                viewer_protocol_policy=cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                cache_policy=cloudfront.CachePolicy.CACHING_OPTIMIZED,
                origin_request_policy=cloudfront.OriginRequestPolicy.CORS_S3_ORIGIN,
                compress=True,
            ),
            additional_behaviors={
                "/assets/*": cloudfront.BehaviorOptions(
                    origin=s3_origin,
                    viewer_protocol_policy=cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                    cache_policy=cloudfront.CachePolicy.CACHING_OPTIMIZED,
                    compress=True,
                ),
            },
            error_responses=[
                cloudfront.ErrorResponse(
                    http_status=403,
                    response_http_status=200,
                    response_page_path="/index.html",
                    ttl=cdk.Duration.seconds(0),
                ),
                cloudfront.ErrorResponse(
                    http_status=404,
                    response_http_status=200,
                    response_page_path="/index.html",
                    ttl=cdk.Duration.seconds(0),
                ),
            ],
            price_class=cloudfront.PriceClass.PRICE_CLASS_100,
            enabled=True,
        )

        cdk.CfnOutput(
            self,
            "PortalBucketName",
            value=self.portal_bucket.bucket_name,
            export_name=f"FitnessRoomPortalBucket-{env_name}",
        )

        cdk.CfnOutput(
            self,
            "PortalCloudFrontDistributionId",
            value=self.distribution.distribution_id,
            export_name=f"FitnessRoomPortalCloudFrontId-{env_name}",
        )

        cdk.CfnOutput(
            self,
            "PortalCloudFrontUrl",
            value=f"https://{self.distribution.distribution_domain_name}",
            export_name=f"FitnessRoomPortalUrl-{env_name}",
        )
