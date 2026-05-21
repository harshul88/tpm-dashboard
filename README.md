# TPM Dashboard

A dark-themed, data-driven dashboard built for Technical Program Managers to track sprint health, engineering performance, and strategic initiative delivery. Designed as a portfolio project demonstrating TPM tooling, DORA metrics, and AI-assisted CI/CD pipelines.

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
| CI/CD | ![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?style=flat&logo=github-actions&logoColor=white) | Automated build, QA review, and deployment |
| Hosting | ![GitHub Pages](https://img.shields.io/badge/GitHub_Pages-222222?style=flat&logo=github&logoColor=white) | Static site hosting from `dist/` |
| AI Agents | ![Claude](https://img.shields.io/badge/Claude_Sonnet_4.6-D97757?style=flat) | Automated code quality and TPM standards review |

---

## Architecture

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
│              (add ai-review label)              │
│                            │                    │
│                  ┌─────────┴──────────┐         │
│                  ▼                    ▼         │
│         QA Agent 1              QA Agent 2      │
│       Code Quality           TPM Standards      │
│       (Claude API)            (Claude API)      │
│                  │                    │         │
│                  └─────────┬──────────┘         │
│                            ▼                    │
│                   Security Scan                 │
│               (npm audit + CodeQL)              │
│                            │                    │
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

---

## CI/CD Pipeline

All three workflows live in `.github/workflows/`.

### QA Agent 1 — Code Quality (`qa-agent-1.yml`)
Triggered on pull requests to `main` when the `ai-review` label is applied (or manually via `workflow_dispatch`). Sends the PR diff to the Claude Sonnet 4.6 API with a senior engineer system prompt. Reviews for bugs, broken imports, hardcoded secrets, missing error handling, leftover `console.log` statements, and accessibility issues. Posts a structured PASSED / WARNINGS / BLOCKERS comment on the PR. Fails the check if any blockers are found.

### QA Agent 2 — TPM Standards (`qa-agent-2.yml`)
Same trigger as Agent 1. Reviews the diff against TPM dashboard standards: chart titles and axis labels, realistic mock data, loading and empty states, no blank screens on first load, and responsive layout at 768px. Posts its own PASSED / WARNINGS / BLOCKERS PR comment. Fails if blockers are detected.

### Deploy (`deploy.yml`)
Triggers automatically on every push to `main` (and supports manual dispatch). Runs `npm ci` and `npm run build`, uploads the `dist/` folder as a Pages artifact, then deploys to GitHub Pages using the official `actions/deploy-pages` action. The live URL is printed as a deployment environment link on every run.

> **Note:** QA Agents are opt-in — they only run when the `ai-review` label is added to a PR, keeping AI API costs under control during routine commits.

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

Open http://localhost:5173 in your browser. The app uses static mock JSON data — no backend or API keys required for local development.

---

## Roadmap

### Shipped
- [x] Sprint Tracker dashboard (kanban, burndown, velocity)
- [x] Engineering Metrics dashboard (DORA metrics, deploy chart, incident log)
- [x] Portfolio Roadmap dashboard (Gantt chart, OKR grid, team capacity, risk register)
- [x] QA Agent 1 — Claude-powered code quality reviewer
- [x] QA Agent 2 — Claude-powered TPM standards reviewer
- [x] GitHub Pages deployment via GitHub Actions

### Coming Soon
- [ ] AWS S3 + CloudFront hosting
- [ ] 3 environments (dev / staging / production)
- [ ] Custom domain
- [ ] AWS WAF + security headers
- [ ] SAST / DAST scanning
- [ ] Notion API live data source
- [ ] GitHub API live DORA metrics
- [ ] AWS Lambda proxy functions
- [ ] Enterprise security hardening (GuardDuty, CloudTrail)
- [ ] Cognito authentication

---

## Author

**Harshul Kumar** — Technical Program Manager
[LinkedIn](https://www.linkedin.com/in/harshulvkumar/)

Built as a TPM learning project to demonstrate program management tooling, engineering metrics, and AI-assisted workflows using [Claude Code](https://claude.ai/code) and the [Anthropic Claude API](https://www.anthropic.com).
