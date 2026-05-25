# TPM OS — Product Requirements Document

---

## Vision

TPM OS saves Technical Program Managers 5+ hours per week by replacing manual data collection and status reporting with automated, real-time program dashboards. Built by a TPM, for TPMs — especially at smaller companies where you don't have a dedicated ops team, a BI analyst, or an executive assistant to help you pull it all together. You already have the data. It's just scattered across six different tools. TPM OS connects them and turns your existing workflow into a live dashboard — automatically.

---

## The Problem

**At smaller companies, there's no easy way to build program dashboards without buying expensive tools.**
The enterprise options (Tableau, Power BI, Confluence dashboards) cost thousands per year, require IT setup, and still need someone to maintain them. Most TPMs end up in spreadsheets and Notion pages instead — which means they're the ones doing the maintenance.

**TPMs spend hours every week just collecting data before they can even write a status report.**
Jira for sprint status. GitHub for deployment metrics. Notion for the roadmap. Google Sheets for the risk register. You're not analyzing anything — you're copy-pasting. That's not what you were hired to do.

**Status updates are stale before stakeholders even open them.**
You spend 2 hours on Friday building the report. By Monday morning, three things have changed. Stakeholders are making decisions on last week's data, and you're already behind on next week's update.

**There's no single place to see what actually matters across all your programs.**
Current wins. Active blockers. Open risks. Upcoming milestones. You know this information — it lives in your head and across a dozen tabs. TPM OS puts it in one place, always current, always ready to share.

---

## Core Value Proposition

**Connect your existing tools once. Get automated status reports forever.**

You don't change how your teams work. You don't ask engineering to switch tools. You point TPM OS at what already exists — and it does the reporting for you.

---

## What a TPM Actually Tracks Every Week

TPM OS is built around the five things every TPM reviews every single week, regardless of program type:

1. **Current wins** — what shipped, what closed, what's worth celebrating
2. **Blockers and escalations** — what's stuck, who needs to act, and how long it's been blocked
3. **Risks and mitigation status** — what could go wrong, what's being done about it, what needs escalation
4. **Upcoming milestones and events** — what's due in the next two weeks, who owns it, is it on track
5. **Key accomplishments for stakeholder updates** — the summary your VP or client actually wants to read

Every dashboard in TPM OS is designed to surface one or more of these five things — nothing else.

---

## Program Types

TPM OS organizes work around programs. A program is anything you own end-to-end: a product release, a compliance deadline, a migration, a strategic initiative. Pick the type that matches your work and get a pre-built set of dashboards ready to go.

### Product Development Program
For managing iterative software delivery with an engineering team. Covers sprint health, deployment performance, and roadmap progress. Answers the question: *is this team on track to ship what they committed to?*

Dashboards included: Sprint Tracker, Engineering Metrics (DORA), Roadmap + OKRs.

### Compliance & Risk Program
For managing TRA findings, security reviews, regulatory deadlines, and audit readiness. Covers open findings, remediation status, evidence collection, and milestone tracking. Answers the question: *are we ready for the audit, and what's still open?*

Dashboards included: Risk & Findings Tracker, Milestone Tracker, Audit Readiness Dashboard.

### Platform & Infrastructure Migration Program
For managing large-scale technical migrations across teams and systems. Covers sprint execution, cross-team dependencies, and engineering health during the transition. Answers the question: *are we migrating on schedule and without breaking things?*

Dashboards included: Sprint Tracker, Engineering Metrics, Dependency Tracker.

### Initiative & OKR Tracking Program
For managing strategic cross-functional initiatives, company-wide OKRs, or executive programs. Covers key result progress, milestone delivery, and stakeholder-ready summaries. Answers the question: *are we making measurable progress on what the company said mattered this quarter?*

Dashboards included: OKR Tracker, Milestone Tracker, Stakeholder Update Dashboard.

---

## Status Report Automation

This is the feature that saves the most time.

Every program in TPM OS automatically generates a **weekly status report** — the same report you currently spend 2 hours writing by hand. It pulls live data from your connected tools, structures it the way stakeholders expect, and has it ready before you've had your Monday morning coffee.

Every automated status report includes:

- **Executive summary** — RAG status (Red / Amber / Green) for the program overall, with one plain-English line explaining why
- **Key accomplishments this week** — what got done, pulled from your sprint and milestone data
- **Blockers needing escalation** — anything that's been stuck for more than a defined threshold, flagged automatically
- **Risks and mitigation status** — open risks from your risk register with current owner and mitigation progress
- **Upcoming milestones** — everything due in the next 14 days, with owner and on-track status
- **Data freshness timestamp** — so stakeholders know they're reading live data, not last week's copy-paste

**Three ways to share it:**
- View in the dashboard (for your own reference)
- Export to PDF (for formal reporting or audit evidence)
- Copy as Markdown (paste directly into email, Slack, or Confluence — formatted and ready to send)

No reformatting. No chasing data. Just review, add any context that requires human judgment, and send.

---

## What We Are Not Building in v1

Being clear about this upfront saves everyone time.

- **No big-picture portfolio rollup.** You won't see a single view across all your programs in v1. Each program lives on its own. Portfolio-level visibility comes in v3.
- **No instant live data.** Data refreshes every 5 minutes. For a status report, that's effectively real-time. We are not building a live trading dashboard.
- **No mobile app.** TPM OS is for your laptop, where you actually do this work. It will look fine on a tablet. It will not be optimized for your phone.
- **No alerts or notifications.** TPM OS won't ping you when a milestone slips or a DORA metric degrades. You pull the data — it doesn't push to you. Notifications are a v4 feature.
- **No shared cloud version.** In v1, you host your own instance. There is no "sign up at tpmos.com" option yet. If you want to run it, you deploy it. The deployment guide gets you live in under 30 minutes.

---

## Success Metrics for v1

We'll know v1 is working when:

- **A TPM saves at least 3 hours per week** compared to their current manual reporting process — measured by feedback from the first 10 users.
- **A status report is generated in under 60 seconds** from the moment a TPM opens the program dashboard.
- **A new program is set up in under 5 minutes** — from picking a template to having a dashboard with mock data rendered and ready to customize.
- **TPM OS works with the tools TPMs already use** — at least one live data source (GitHub, Notion, Jira, or Google Sheets) connected and working per program template before v1 ships.

---

## Version Roadmap

| Version | Theme | What you can do |
|---|---|---|
| **v1.0** | Get your first dashboard live in 30 minutes | Set up any of the 4 program templates with mock data, generate your first automated status report, deploy to AWS with one command |
| **v2.0** | Connect your real tools, eliminate manual data entry | Point each dashboard field at GitHub, Notion, Jira, or Google Sheets — your status reports start writing themselves from live data |
| **v3.0** | See your full portfolio in one view | One screen that shows the health of every program you own, with the ability to share publicly and deploy to Vercel in one click |
| **v4.0** | Share with your team, manage access by role | Invite your engineering leads, executives, and stakeholders — each sees exactly what's relevant to them, nothing more |
