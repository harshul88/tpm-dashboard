# TPM Dashboard — Infrastructure

AWS CDK v2 (TypeScript) stack for the TPM Dashboard. Provisions all cloud resources in the Sandbox account (`525112566317`, `us-east-1`).

---

## What This Stack Provisions

| Resource | Name / ID | Purpose |
|---|---|---|
| S3 Bucket | `tpm-dashboard-dev` | Local dev sync target |
| S3 Bucket | `tpm-dashboard-staging` | Staging environment origin |
| S3 Bucket | `tpm-dashboard-prod` | Production environment origin |
| CloudFront Distribution | auto-assigned | Staging CDN (PriceClass 100) |
| CloudFront Distribution | auto-assigned | Production CDN (PriceClass 100) |
| CloudFront OAC | `tpm-dashboard-staging-oac` | Staging S3 → CloudFront auth |
| CloudFront OAC | `tpm-dashboard-prod-oac` | Prod S3 → CloudFront auth |
| Response Headers Policy | `tpm-dashboard-security-headers` | CSP, HSTS, X-Frame-Options, etc. |
| IAM OIDC Provider | `token.actions.githubusercontent.com` | GitHub Actions federation |
| IAM Role | `GitHubActionsDeployRole` | Keyless CI deployments |
| SSM Parameter | `/tpm-dashboard/staging/cloudfront-id` | Staging distribution ID |
| SSM Parameter | `/tpm-dashboard/prod/cloudfront-id` | Prod distribution ID |
| SSM Parameter | `/tpm-dashboard/staging/bucket-name` | Staging bucket name |
| SSM Parameter | `/tpm-dashboard/prod/bucket-name` | Prod bucket name |

### Security posture

- All S3 buckets block public access — served via CloudFront OAC only
- OAC bucket policies are scoped to a specific distribution ARN (no cross-distribution access)
- TLS 1.2+ enforced on all CloudFront distributions
- Security headers on every response (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy)
- GitHub Actions OIDC role trust policy scoped to `repo:harshul88/tpm-dashboard:*` only
- OIDC role permissions are least-privilege: S3 sync on staging/prod buckets + CloudFront invalidation only

---

## Prerequisites

1. Node.js 18+ and npm
2. AWS CDK v2 installed globally: `npm install -g aws-cdk`
3. AWS SSO authenticated: `aws sso login --profile tpm-dashboard`
4. CDK bootstrapped in the target account (**blocked** — see note below)

> **Bootstrap blocker:** A Control Tower SCP on the Sandbox OU currently blocks `cloudformation:*`, which CDK bootstrap requires. The SCP must be updated in the management account before any CDK commands will work. See [GitHub Issue #5](https://github.com/harshul88/tpm-dashboard/issues/5) for details.

---

## Install Dependencies

```bash
cd infrastructure
npm install
```

---

## CDK Commands

```bash
# Synthesize CloudFormation template (no AWS calls)
npm run synth

# Preview changes against deployed stack
npm run diff

# Deploy the stack
npm run deploy

# Destroy the stack (buckets are RETAIN — manual deletion required)
npm run destroy
```

Or use the CDK CLI directly:

```bash
cdk synth --profile tpm-dashboard
cdk diff --profile tpm-dashboard
cdk deploy --profile tpm-dashboard
cdk destroy --profile tpm-dashboard
```

---

## After First Deploy

1. Copy the `GitHubActionsRoleArn` output value
2. Add it to the GitHub repo as a secret named `AWS_ROLE_ARN`
3. Update `.github/workflows/deploy.yml` to use OIDC:

```yaml
- name: Configure AWS credentials
  uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
    aws-region: us-east-1
```

4. Read CloudFront IDs from SSM in the deploy workflow:

```yaml
- name: Get deploy targets
  run: |
    STAGING_BUCKET=$(aws ssm get-parameter --name /tpm-dashboard/staging/bucket-name --query Parameter.Value --output text)
    STAGING_CF_ID=$(aws ssm get-parameter --name /tpm-dashboard/staging/cloudfront-id --query Parameter.Value --output text)
```

---

## Cost Estimate

All estimates assume a low-traffic portfolio site (~1,000 visitors/month).

| Resource | Monthly Cost |
|---|---|
| S3 storage (3 buckets × ~15 MB) | ~$0.01 |
| S3 requests (PUT on deploy, GET via CloudFront) | ~$0.01 |
| CloudFront data transfer (PriceClass 100, <1 GB/month) | $0.00 (free tier) |
| CloudFront HTTPS requests (<10M/month) | $0.00 (free tier) |
| SSM Standard Parameters (4 params) | $0.00 (free tier) |
| IAM / OIDC | $0.00 |
| **Total** | **~$0 – $2/month** |

Free tier covers virtually all costs for a portfolio-scale site. Costs scale linearly with traffic if you exceed 1 TB/month data transfer or 10M requests/month.

---

## Stack Structure

```
infrastructure/
├── bin/
│   └── tpm-dashboard.ts      # CDK app entry point
├── lib/
│   └── tpm-dashboard-stack.ts  # All resources defined here
├── cdk.json                  # CDK config and feature flags
├── package.json
├── tsconfig.json
└── README.md
```
