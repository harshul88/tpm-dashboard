import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';

export class TpmDashboardStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // =========================================================================
    // S3 BUCKETS
    // Three buckets: dev (local sync target), staging, and prod.
    // All buckets block public access — content is served exclusively through
    // CloudFront using Origin Access Control (OAC).
    // =========================================================================

    const sharedBucketProps: s3.BucketProps = {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      versioned: true,
      // RETAIN on destroy so a mistaken `cdk destroy` never wipes live content.
      removalPolicy: RemovalPolicy.RETAIN,
      lifecycleRules: [
        {
          // Prune old object versions after 30 days to control storage costs.
          noncurrentVersionExpiration: Duration.days(30),
        },
      ],
    };

    const devBucket = new s3.Bucket(this, 'DevBucket', {
      ...sharedBucketProps,
      bucketName: 'tpm-dashboard-dev',
    });

    const stagingBucket = new s3.Bucket(this, 'StagingBucket', {
      ...sharedBucketProps,
      bucketName: 'tpm-dashboard-staging',
    });

    const prodBucket = new s3.Bucket(this, 'ProdBucket', {
      ...sharedBucketProps,
      bucketName: 'tpm-dashboard-prod',
    });

    // Suppress unused-variable warning — devBucket is provisioned but has no
    // CloudFront distribution (local `vite build && aws s3 sync` workflow).
    void devBucket;

    // =========================================================================
    // CLOUDFRONT SECURITY HEADERS RESPONSE POLICY
    // Shared across both distributions. Sets defensive HTTP response headers
    // that browsers use to mitigate XSS, clickjacking, and data injection.
    // =========================================================================

    const securityHeadersPolicy = new cloudfront.ResponseHeadersPolicy(
      this,
      'SecurityHeadersPolicy',
      {
        responseHeadersPolicyName: 'tpm-dashboard-security-headers',
        comment: 'Security headers shared by staging and prod distributions',
        securityHeadersBehavior: {
          // CSP: restrict resource origins to self; allow inline styles for
          // Tailwind and external images/fonts for chart libraries.
          contentSecurityPolicy: {
            contentSecurityPolicy: [
              "default-src 'self'",
              "script-src 'self'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self'",
              "connect-src 'self' https:",
              "frame-ancestors 'none'",
            ].join('; '),
            override: true,
          },
          // HSTS: force HTTPS for 2 years, include subdomains, allow preload list.
          strictTransportSecurity: {
            accessControlMaxAge: Duration.seconds(63072000),
            includeSubdomains: true,
            preload: true,
            override: true,
          },
          // X-Frame-Options: block all iframe embedding (clickjacking protection).
          frameOptions: {
            frameOption: cloudfront.HeadersFrameOption.DENY,
            override: true,
          },
          // X-Content-Type-Options: prevent MIME-type sniffing.
          contentTypeOptions: {
            override: true,
          },
          // Referrer-Policy: send origin only on cross-origin requests.
          referrerPolicy: {
            referrerPolicy:
              cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
            override: true,
          },
        },
        // Permissions-Policy: disable browser APIs the dashboard doesn't use.
        customHeadersBehavior: {
          customHeaders: [
            {
              header: 'Permissions-Policy',
              value: 'camera=(), microphone=(), geolocation=()',
              override: true,
            },
          ],
        },
      }
    );

    // =========================================================================
    // CLOUDFRONT DISTRIBUTIONS
    // Staging and prod each get their own distribution.
    // S3BucketOrigin.withOriginAccessControl() is the current L2 API — it
    // creates an OAC, sets the correct SigV4-signed S3 origin config, and adds
    // the bucket policy scoped to this distribution's ARN automatically.
    // No manual OAC constructs or L1 escape hatches required.
    // =========================================================================

    const makeDistribution = (
      bucket: s3.Bucket,
      id: string
    ): cloudfront.Distribution =>
      new cloudfront.Distribution(this, id, {
        defaultBehavior: {
          origin: origins.S3BucketOrigin.withOriginAccessControl(bucket),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
          responseHeadersPolicy: securityHeadersPolicy,
        },
        defaultRootObject: 'index.html',
        // Reject TLS 1.0 and 1.1 connections.
        minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
        // PriceClass_100 = US + Canada + Europe PoPs only (lowest cost tier).
        priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
        errorResponses: [
          // Return index.html for 403/404 so React Router handles navigation
          // client-side without CloudFront surfacing an error page.
          { httpStatus: 403, responseHttpStatus: 200, responsePagePath: '/index.html' },
          { httpStatus: 404, responseHttpStatus: 200, responsePagePath: '/index.html' },
        ],
      });

    const stagingDistribution = makeDistribution(stagingBucket, 'StagingDistribution');
    const prodDistribution = makeDistribution(prodBucket, 'ProdDistribution');

    // =========================================================================
    // GITHUB ACTIONS OIDC
    // Enables keyless authentication from GitHub Actions — no static AWS
    // credentials stored in GitHub Secrets. The workflow exchanges a
    // short-lived GitHub OIDC token for temporary AWS credentials via STS.
    //
    // Note: if an OIDC provider for token.actions.githubusercontent.com already
    // exists in this account, importing it with
    // `iam.OpenIdConnectProvider.fromOpenIdConnectProviderArn()` avoids a
    // duplicate-resource error. First-time deploys are safe to create it here.
    // =========================================================================

    const githubOidcProvider = new iam.OpenIdConnectProvider(
      this,
      'GitHubOIDCProvider',
      {
        url: 'https://token.actions.githubusercontent.com',
        // AWS validates the audience claim in the GitHub OIDC token.
        clientIds: ['sts.amazonaws.com'],
        // Thumbprint for token.actions.githubusercontent.com.
        // AWS manages certificate rotation for this provider automatically.
        thumbprints: ['6938fd4d98bab03faadb97b34396831e3780aea1'],
      }
    );

    const deployRole = new iam.Role(this, 'GitHubActionsDeployRole', {
      roleName: 'GitHubActionsDeployRole',
      description:
        'Assumed by GitHub Actions for keyless S3 sync and CloudFront invalidation',
      assumedBy: new iam.WebIdentityPrincipal(
        githubOidcProvider.openIdConnectProviderArn,
        {
          StringEquals: {
            // Audience claim — must match the clientId above.
            'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
          },
          StringLike: {
            // Subject claim — locked to this repo. The wildcard allows any
            // branch/environment/ref within harshul88/tpm-dashboard only.
            'token.actions.githubusercontent.com:sub':
              'repo:harshul88/tpm-dashboard:*',
          },
        }
      ),
    });

    // S3: sync built Vite output to staging and prod (not dev — dev is local only).
    deployRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'S3DeployAccess',
        effect: iam.Effect.ALLOW,
        actions: [
          's3:PutObject',
          's3:DeleteObject',
          's3:GetObject',
          's3:ListBucket',
        ],
        resources: [
          stagingBucket.bucketArn,
          `${stagingBucket.bucketArn}/*`,
          prodBucket.bucketArn,
          `${prodBucket.bucketArn}/*`,
        ],
      })
    );

    // CloudFront: invalidate the cache after each deploy so users see new content.
    deployRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'CloudFrontInvalidation',
        effect: iam.Effect.ALLOW,
        actions: ['cloudfront:CreateInvalidation'],
        resources: [
          `arn:aws:cloudfront::${this.account}:distribution/${stagingDistribution.distributionId}`,
          `arn:aws:cloudfront::${this.account}:distribution/${prodDistribution.distributionId}`,
        ],
      })
    );

    // =========================================================================
    // SSM PARAMETERS
    // Store distribution IDs and bucket names so deploy workflows can read them
    // at runtime without hardcoding IDs in the workflow YAML.
    // =========================================================================

    new ssm.StringParameter(this, 'StagingDistributionId', {
      parameterName: '/tpm-dashboard/staging/cloudfront-id',
      stringValue: stagingDistribution.distributionId,
      description: 'CloudFront distribution ID — staging',
    });

    new ssm.StringParameter(this, 'ProdDistributionId', {
      parameterName: '/tpm-dashboard/prod/cloudfront-id',
      stringValue: prodDistribution.distributionId,
      description: 'CloudFront distribution ID — prod',
    });

    new ssm.StringParameter(this, 'StagingBucketName', {
      parameterName: '/tpm-dashboard/staging/bucket-name',
      stringValue: stagingBucket.bucketName,
      description: 'S3 bucket name — staging',
    });

    new ssm.StringParameter(this, 'ProdBucketName', {
      parameterName: '/tpm-dashboard/prod/bucket-name',
      stringValue: prodBucket.bucketName,
      description: 'S3 bucket name — prod',
    });

    // =========================================================================
    // STACK OUTPUTS
    // Printed after `cdk deploy` completes. Copy the role ARN into the repo's
    // GitHub Actions secrets as AWS_ROLE_ARN.
    // =========================================================================

    new cdk.CfnOutput(this, 'StagingDomain', {
      value: stagingDistribution.distributionDomainName,
      description: 'Staging CloudFront domain (use until custom domain is wired up)',
    });

    new cdk.CfnOutput(this, 'ProdDomain', {
      value: prodDistribution.distributionDomainName,
      description: 'Production CloudFront domain (use until custom domain is wired up)',
    });

    new cdk.CfnOutput(this, 'GitHubActionsRoleArn', {
      value: deployRole.roleArn,
      description: 'Add this ARN to GitHub repo secrets as AWS_ROLE_ARN',
    });
  }
}
