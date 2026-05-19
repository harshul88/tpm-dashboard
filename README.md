# TPM Dashboard

A portfolio project built to demonstrate Technical Program Manager skills through a working engineering dashboard.

## Features

- **Sprint Tracker** — Kanban board, burndown chart, and velocity chart powered by mock sprint data
- **Engineering Metrics** — Sprint velocity trends, completion rates, and bug counts across 6 sprints
- **Roadmap** — Initiative tracking with status badges, owners, timelines, and progress bars

## Tech Stack

- React 18 + Vite
- Tailwind CSS (dark theme)
- Recharts for data visualization
- Mock JSON data (no backend required)

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Project Structure

```
src/
  components/       # Sidebar navigation
  views/            # Sprint Tracker, Engineering Metrics, Roadmap
  data/             # Mock JSON: tickets, sprints, initiatives
```

## CI/CD

Every pull request to `main` runs three automated checks:

| Workflow | Trigger | What it checks |
|---|---|---|
| QA Agent 1 — Code Quality | PR to main | Bugs, secrets, missing error handling (Claude) |
| QA Agent 2 — TPM Standards | After Agent 1 passes | Chart labels, realistic data, empty states (Claude) |
| Security Scan | PR to main | npm audit, CodeQL, accidental .env commits |
