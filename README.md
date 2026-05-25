# TPM Dashboard

A dark-themed, data-driven dashboard built for Technical Program Managers to track sprint health, engineering performance, and strategic initiative delivery. Designed as a portfolio project demonstrating TPM tooling, DORA metrics, AI-assisted CI/CD pipelines, and cloud infrastructure engineering on AWS.

## Live Demo

- **Production:** https://harshul88.github.io/tpm-dashboard
- **Repository:** https://github.com/harshul88/tpm-dashboard

---

## Dashboards

### Sprint Tracker
Tracks the active sprint in real time. Shows a kanban board (To Do / In Progress / Done), a burndown chart comparing ideal vs. actual story point burn, and a velocity history bar chart across past sprints. Solves the TPM problem of knowing at a glance whether a sprint is on track or slipping — and by how much.

### Engineering Metrics
Surfaces DORA metrics — Deployment Frequency, Lead Time for Changes, MTTR, and Change Failure Rate — each benchmarked against 2024 Elite / High / Medium / Low tiers. Includes a 28-day stacked deploy chart, a lead time scatter plot, and a reverse-chronological incident log. Solves the TPM problem of measuring and communicating engineering delivery health to stakeholders.

### Portfolio Roadmap
Visualizes 8 cross-team strategic initiatives on a custom Gantt chart (Apr–Sep 2026) with progress fills and a live Today marker. Includes an OKR 2×2 progress grid, team capacity bars with over-allocation warnings, and a risk register with severity ratings. Solves the TPM problem of tracking program-level dependencies, resource constraints, and strategic alignment in one view.

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend Framework | ![React](https://img.shields.io/badge/React_18-20232A?style=flat&logo=react&logoColor=61DAFB) | Component-based UI |
| Build Tool | ![Vite](https://img.shields.io/badge/Vite_5-646CFF?style=flat&logo=vite&logoColor=white) | Fast dev server and production bundler |
| Charting | ![Recharts](https://img.shields.io/badge/Recharts_2-22b5bf?style=flat) | Burndown, velocity, DORA, and capacity charts |
| Styling | ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_3-38B2AC?style=flat&logo=tailwind-css&logoColor=white) | Utility-first dark theme |
| CI/CD | ![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?style=flat&logo=github-actions&logoColor=white) | Automated build, QA review, security scan, and deployment |
| Hosting (current) | ![GitHub Pages](https://img.shields.io/badge/GitHub_Pages-222222?style=flat&logo=github&logoColor=white) | Static site hosting from `dist/` |
| Hosting (Phase 4) | ![S3](https://img.shields.io/badge/AWS_S3-569A31?style=flat&logo=amazon-s3&logoColor=white) ![CloudFront](https://img.shields.io/badge/CloudFront-FF9900?style=flat&logo=amazon-aws&logoColor=white) | Multi-environment CDN hosting |
| Infrastructure as Code | ![AWS CDK](https://img.shields.io/badge/AWS_CDK-FF9900?style=flat&logo=amazon-aws&logoColor=white) | Reproducible cloud infrastructure stacks |
| Keyless Deployments | ![OIDC](https://img.shields.io/badge/GitHub_Actions_OIDC-2088FF?style=flat&logo=github-actions&logoColor=white) | No static AWS credentials in CI (Phase 4) |
| Cloud Governance | ![AWS Control Tower](https://img.shields.io/badge/AWS_Control_Tower-FF9900?style=flat&logo=amazon-aws&logoColor=white) | Landing zone with enrolled Sandbox account (`525112566317`) in `us-east-1` |
| Identity & Access | ![IAM Identity Center](https://img.shields.io/badge/IAM_Identity_Center-FF9900?style=flat&logo=amazon-aws&logoColor=white) | SSO access management — no long-lived credentials anywhere |
| Security (Phase 5) | ![WAF](https://img.shields.io/badge/AWS_WAF-DD344C?style=flat&logo=amazon-aws&logoColor=white) ![GuardDuty](https://img.shields.io/badge/GuardDuty-DD344C?style=flat&logo=amazon-aws&logoColor=white) | Edge protection and continuous threat detection |
| AI Agents | ![Claude](https://img.shields.io/badge/Claude_Sonnet_4.6-D97757?style=flat) | Opt-in code quality and TPM standards review on PRs |

---

## Architecture

### Current (GitHub Pages)

```
Local Development
      │
      │  git push origin feature/*
      ▼
┌─────────────────────────────────────────────────┐
│                  GitHub                         │
│                                                 │
│  feature branch  ──►  Pull Request              │
│                            │                    │
│                   Security Scan (every PR)      │
│               (npm audit + CodeQL + .env check) │
│                            │                    │
│              (add ai-review label, optional)    │
│                            │                    │
│                  ┌─────────┴──────────┐         │
│                  ▼                    ▼         │
│         QA Agent 1              QA Agent 2      │
│       Code Quality           TPM Standards      │
│       (Claude API)            (Claude API)      │
│                  │                    │         │
│                  └─────────┬──────────┘         │
│                            ▼                    │
│                  Merge to main                  │
│                            │                    │
│                            ▼                    │
│                  Deploy Workflow                │
│               (npm ci → npm run build)          │
└─────────────────────────────────────────────────┘
                             │
                             │  actions/deploy-pages
                             ▼
                    GitHub Pages
             https://harshul88.github.io/tpm-dashboard
```

### Target: 3-Environment Promotion Pipeline (Phase 4)

```
Local Development
      │
      │  git push origin feature/*
      ▼
┌──────────────────────────────────────────────────────────────┐
│                         GitHub                               │
│                                                              │
│  feature branch  ──►  Pull Request                          │
│                             │                               │
│                    Security Scan (every PR)                 │
│                (npm audit + CodeQL + OWASP ZAP)             │
│                             │                               │
│               (add ai-review label, optional)               │
│                             │                               │
│                   ┌─────────┴──────────┐                    │
│                   ▼                    ▼                    │
│          QA Agent 1              QA Agent 2                 │
│        Code Quality           TPM Standards                 │
│                   └─────────┬──────────┘                    │
│                             │                               │
│                   Merge to main                             │
│                             │                               │
│               ┌─────────────┘                               │
│               │  GitHub Actions OIDC                        │
│               │  (no static credentials)                    │
│               ▼                                             │
│     Auto-deploy → Staging                                   │
│                             │                               │
│               Manual approval gate                          │
│                             │                               │
│               ▼                                             │
│     Promote → Production                                    │
└──────────────────────────────────────────────────────────────┘
          │ Staging                      │ Production
          ▼                             ▼
  S3 + CloudFront               S3 + CloudFront
  staging.tpm-dashboard.com     tpm-dashboard.com
  (Route 53 + ACM TLS)          (Route 53 + ACM TLS)
                     │                │
                     └──── AWS WAF ───┘
                       (Phase 5 security)
```

---

## CI/CD Pipeline

All workflows live in `.github/workflows/`.

### Security Scan — `security-scan.yml`
Triggered on **every pull request** to `main`. Runs three checks in sequence:
1. **npm audit** — fails on moderate or higher severity vulnerabilities
2. **.env file detection** — blocks any PR that accidentally includes secrets in the diff
3. **CodeQL SAST** — static analysis for JavaScript/JSX security issues

This workflow runs unconditionally; it cannot be skipped.

### QA Agent 1 — Code Quality (`qa-agent-1.yml`)
Triggered on pull requests to `main` **only when the `ai-review` label is applied** (or manually via `workflow_dispatch`). Sends the PR diff to the Claude Sonnet 4.6 API with a senior engineer system prompt. Reviews for bugs, broken imports, hardcoded secrets, missing error handling, leftover `console.log` statements, and accessibility issues. Posts a structured PASSED / WARNINGS / BLOCKERS comment on the PR. Fails the check if any blockers are found.

### QA Agent 2 — TPM Standards (`qa-agent-2.yml`)
Same trigger as Agent 1. Reviews the diff against TPM dashboard standards: chart titles and axis labels, realistic mock data, loading and empty states, no blank screens on first load, and responsive layout at 768px. Posts its own PASSED / WARNINGS / BLOCKERS PR comment. Fails if blockers are detected.

> **Note:** QA Agents are opt-in — they only run when the `ai-review` label is added to a PR, keeping AI API costs under control during routine commits.

### Deploy — `deploy.yml`
Triggers automatically on every push to `main` (and supports manual dispatch). Runs `npm ci` and `npm run build`, uploads the `dist/` folder as a Pages artifact, then deploys to GitHub Pages using the official `actions/deploy-pages` action. The live URL is printed as a deployment environment link on every run.

---

## AWS Infrastructure

The AWS infrastructure follows a governed, multi-account architecture. No long-lived credentials exist anywhere — local development uses SSO and CI/CD will use GitHub Actions OIDC federation.

### Current State

```
AWS Organization (Management Account)
          │
          │  AWS Control Tower — landing zone
          │
          ├── Log Archive Account
          ├── Audit Account
          └── Sandbox Account (525112566317)  ◄── active development
                    │  us-east-1
                    │
          ┌─────────┴──────────────────────────────┐
          │                                        │
   IAM Identity Center SSO                Future Resources (Phase 4)
   (permission sets, no static keys)    S3 · CloudFront · Lambda
                                         Route 53 · ACM · WAF
                                         GuardDuty · CloudTrail
```

### Target State (Phase 4)

```
AWS Organization
          │
          └── Sandbox Account (525112566317), us-east-1
                    │
          ┌─────────┴──────────────────────────────────────┐
          │                                                │
   AWS CDK Stacks                              IAM / Auth
   ┌──────────────┐                   GitHub Actions OIDC role
   │  Dev Env     │  (local)          (scoped to repo + branch,
   ├──────────────┤                    S3 sync + CF invalidation only)
   │  Staging Env │  S3 + CloudFront + Route 53 + ACM
   ├──────────────┤
   │  Prod Env    │  S3 + CloudFront + Route 53 + ACM + WAF
   └──────────────┘
```

### SSO profile setup (local dev)

```bash
aws configure sso --profile tpm-dashboard
# SSO start URL:  https://<org>.awsapps.com/start
# Region:         us-east-1

aws sso login --profile tpm-dashboard
aws sts get-caller-identity --profile tpm-dashboard
```

---

## Getting Started

**Prerequisites:** Node.js 18+ and npm.

```bash
# 1. Clone the repository
git clone https://github.com/harshul88/tpm-dashboard.git
cd tpm-dashboard

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
```

Open http://localhost:5173 in your browser. The app uses static mock data — no backend or API keys required for local development.

---

## Roadmap

### Shipped
- [x] Sprint Tracker dashboard (kanban, burndown, velocity)
- [x] Engineering Metrics dashboard (DORA metrics, deploy chart, incident log)
- [x] Portfolio Roadmap dashboard (Gantt chart, OKR grid, team capacity, risk register)
- [x] QA Agent 1 — Claude-powered code quality reviewer (opt-in via `ai-review` label)
- [x] QA Agent 2 — Claude-powered TPM standards reviewer (opt-in via `ai-review` label)
- [x] Security scan on every PR (npm audit + CodeQL + .env detection)
- [x] GitHub Pages deployment via GitHub Actions
- [x] AWS Control Tower landing zone with Sandbox account (`525112566317`, `us-east-1`)
- [x] IAM Identity Center SSO — no static credentials anywhere
- [x] AWS CDK installed and configured

### Coming Soon
- [ ] CDK bootstrap (pending Control Tower update)
- [ ] S3 + CloudFront hosting across 3 environments (dev / staging / prod)
- [ ] Custom domain via Route 53 + ACM
- [ ] GitHub Actions OIDC — keyless AWS deployments from CI
- [ ] AWS WAF on CloudFront distributions
- [ ] Cognito authentication
- [ ] AWS Lambda proxy functions for live data
- [ ] Notion API integration (live roadmap data)
- [ ] GitHub API integration (live DORA metrics)
- [ ] Enterprise security hardening (GuardDuty, CloudTrail, Secrets Manager, Config)

---

## Author

**Harshul Kumar** — Technical Program Manager
[LinkedIn](https://www.linkedin.com/in/harshulvkumar/)

Built as a TPM learning project to demonstrate program management tooling, engineering metrics, and AI-assisted workflows using [Claude Code](https://claude.ai/code) and the [Anthropic Claude API](https://www.anthropic.com).
