#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { TpmDashboardStack } from '../lib/tpm-dashboard-stack';

const app = new cdk.App();

new TpmDashboardStack(app, 'TpmDashboardStack', {
  // Hardcode the Sandbox account and region so synth/deploy never rely on
  // ambient credentials that could accidentally target the wrong account.
  env: {
    account: '188348131654',
    region: 'us-east-1',
  },
  description: 'TPM Dashboard — S3 buckets, CloudFront distributions, GitHub Actions OIDC role, and SSM parameters',
});
