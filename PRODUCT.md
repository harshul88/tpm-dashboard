# TPM OS — Product Requirements Document

---

## Vision

TPM OS is an open-source dashboard platform for Technical Program Managers. A TPM manages a portfolio of programs — each program gets its own set of dashboards tailored to the program type. Dashboards are modular: picked from a library of templates and customized per program. Data sources are configured at the field level, so a single dashboard can pull ticket status from Jira, story points from Google Sheets, and team capacity from mock data — all at once. The result is a single operational surface that gives a TPM and their stakeholders a clear, real-time view of every program they own, without forcing a single tool or workflow on the teams they partner with.

---

## Problem Statement

- **TPMs operate across too many tools.** Sprint health lives in Jira, DORA metrics in GitHub, OKRs in Notion, risk registers in spreadsheets. There is no single place to see the health of a full program, let alone a portfolio of programs.
- **Stakeholder reporting is manual and expensive.** Weekly status updates, executive RAG summaries, and audit readiness packages are assembled by hand from multiple sources — work that consumes hours a TPM should be spending on unblocking teams.
- **Dashboards are either too generic or too locked-in.** Off-the-shelf tools (Jira dashboards, Notion databases) are built for teams, not TPMs managing cross-team programs. Purpose-built TPM tools are expensive, opinionated, and require buy-in from engineering teams who already have their own workflows.

---

## Core Concepts

| Term | Definition |
|---|---|
| **Portfolio** | A collection of programs owned and managed by one TPM. The portfolio is the top-level container — everything a TPM is responsible for lives here. |
| **Program** | A tracked unit of work with a defined scope, timeline, and set of stakeholders. Programs come in types: product development, compliance/TRA, platform migration, initiative tracking. Each program type gets a corresponding template. |
| **Dashboard** | A visualization module attached to a program. Each dashboard has a purpose (e.g. sprint health, DORA metrics, risk register), a layout, and one or more data source bindings. Dashboards are the atomic unit of the platform. |
| **Template** | A pre-built set of dashboards grouped for a specific program type. Templates are the starting point — a TPM picks a template when creating a program and then customizes from there. |
| **Data source** | Where a dashboard field pulls its data from. Sources are configured at the field level, not the dashboard level, so a single dashboard can mix Jira, Google Sheets, Notion, GitHub, and mock data simultaneously. |

---

## Program Templates (v1)

### 1. Product Development Program
For TPMs running iterative software delivery programs with engineering teams.

| Dashboard | Data Source |
|---|---|
| Sprint Tracker | Jira / GitHub / mock |
| Engineering Metrics — DORA | GitHub / mock |
| Roadmap + OKRs | Notion / Google Sheets / mock |

### 2. Compliance / TRA Program
For TPMs managing regulatory, security, or third-party risk assessments.

| Dashboard | Data Source |
|---|---|
| Risk & Findings Tracker | Google Sheets / mock |
| Milestone Tracker | Notion / mock |
| Audit Readiness Dashboard | mock — future |

### 3. Platform Migration Program
For TPMs overseeing infrastructure, platform, or system migration programs.

| Dashboard | Data Source |
|---|---|
| Sprint Tracker | Jira / GitHub / mock |
| Engineering Metrics | GitHub / mock |
| Dependency Tracker | mock — future |

### 4. Initiative Tracking Program
For TPMs driving strategic initiatives, cross-functional OKRs, or executive programs.

| Dashboard | Data Source |
|---|---|
| OKR Tracker | Google Sheets / Notion / mock |
| Milestone Tracker | Notion / mock |
| Stakeholder Update Dashboard | mock — future |

---

## Dashboard Catalog (v1)

### Sprint Tracker
- **Purpose:** Track active sprint health — kanban board, burndown, and velocity history.
- **Default data source:** Mock
- **Available data sources:** Jira, GitHub Projects, mock
- **Templates:** Product Development, Platform Migration

### Engineering Metrics — DORA
- **Purpose:** Surface Deployment Frequency, Lead Time for Changes, Change Failure Rate, and MTTR benchmarked against Elite/High/Medium/Low tiers.
- **Default data source:** Mock
- **Available data sources:** GitHub, mock
- **Templates:** Product Development, Platform Migration

### Roadmap + OKRs
- **Purpose:** Visualize program-level initiatives on a Gantt chart alongside OKR progress, team capacity, and a risk register.
- **Default data source:** Mock
- **Available data sources:** Notion, Google Sheets, mock
- **Templates:** Product Development

### OKR Tracker
- **Purpose:** Track Objectives and Key Results with current vs. target progress and ownership mapping.
- **Default data source:** Mock
- **Available data sources:** Google Sheets, Notion, mock
- **Templates:** Initiative Tracking

### Milestone Tracker
- **Purpose:** Show program milestones, owners, due dates, and RAG status in a timeline view.
- **Default data source:** Mock
- **Available data sources:** Notion, mock
- **Templates:** Compliance / TRA, Initiative Tracking

### Risk & Findings Tracker
- **Purpose:** Log risks and audit findings with severity ratings, owners, and remediation status.
- **Default data source:** Mock
- **Available data sources:** Google Sheets, mock
- **Templates:** Compliance / TRA

### Audit Readiness Dashboard
- **Purpose:** Aggregate evidence completion, control coverage, and readiness score ahead of an audit.
- **Default data source:** Mock — future
- **Available data sources:** mock (v1), Google Sheets (v2)
- **Templates:** Compliance / TRA

### Dependency Tracker
- **Purpose:** Map cross-team and cross-system dependencies, surfacing blockers and delivery risk.
- **Default data source:** Mock — future
- **Available data sources:** mock (v1), Jira (v2)
- **Templates:** Platform Migration

### Stakeholder Update Dashboard
- **Purpose:** Auto-generate a read-only executive summary with RAG status, milestone progress, and key risks.
- **Default data source:** Mock — future
- **Available data sources:** mock (v1), aggregated from other dashboards (v2)
- **Templates:** Initiative Tracking

---

## Data Source Flexibility

TPM OS uses a **field-level configuration model** — data sources are bound to individual fields within a dashboard, not to the dashboard as a whole.

This means a single dashboard can simultaneously pull from multiple sources. For example, the Sprint Tracker might be configured as:

| Field | Data Source |
|---|---|
| Ticket status (To Do / In Progress / Done) | Jira |
| Story point estimates | Google Sheets |
| Team capacity and allocation | Mock |
| Burndown actuals | GitHub Projects |

This approach respects the reality of how TPMs work: engineering teams own their tools, and forcing a single source of truth across teams is rarely achievable. Field-level binding lets the TPM meet each team where they are.

In v1, all fields default to mock data. In v2, each field can be independently remapped to a live source via a configuration UI — no code required.

---

## User Roles (v1)

| Role | Access |
|---|---|
| **TPM (owner)** | Full read + write access. Can create programs, configure dashboards, bind data sources, and manage the portfolio. |
| **Engineering Lead** | Read access across all dashboards. Expanded detail view on Engineering Metrics (DORA) — can see raw deployment and incident data. |
| **Executive** | Read-only RAG summary view. Sees milestone status, top risks, and OKR progress. No access to sprint-level detail. |
| **Stakeholder** | Read-only milestone view. Sees timeline, owners, and status only. No access to engineering metrics or risk detail. |

---

## What We Are NOT Building in v1

- **No portfolio rollup view.** Each program is managed independently. A cross-program portfolio summary is a v3 feature.
- **No real-time data.** A 5-minute cache on all data source calls is acceptable for v1. Live websocket updates are out of scope.
- **No mobile app.** TPM OS is a desktop-first web application. Mobile responsiveness is a best-effort concern, not a hard requirement.
- **No notifications or alerts.** Proactive alerts (milestone slippage, DORA degradation, risk escalation) are out of scope for v1.
- **No multi-tenant SaaS.** v1 is self-hosted only. Each team deploys their own instance. A managed cloud offering is a v3+ consideration.

---

## Success Metrics for v1

- A TPM can create a new program and select a template in **under 5 minutes** from first login.
- A non-technical PM can deploy TPM OS with mock data and have all dashboards rendering in **under 30 minutes** using the deployment guide.
- All 4 program templates work end-to-end with mock data — no broken views, no empty states without explanation.
- At least one real data source is connected and working per program template (GitHub for DORA, Notion for roadmap/milestones, Google Sheets for risk/OKRs).

---

## Version Roadmap

| Version | Theme | Scope |
|---|---|---|
| **v1.0** | Foundation | 4 program templates, all dashboards on mock data, AWS S3 + CloudFront deployment, GitHub Actions CI/CD |
| **v2.0** | Live data | GitHub, Notion, Jira, and Google Sheets integrations; field-level data source configuration UI; Lambda proxy layer |
| **v3.0** | Scale | Portfolio rollup view, 1-click Vercel deploy, public template library |
| **v4.0** | Collaboration | Multi-user support, role-based access control, milestone notifications and alerts |
