# TPM OS — API Contract

**Version:** v1  
**Base path:** `/api/v1`  
**Last updated:** 2026-05-25

---

## Design Principles

1. **Program-centric.** Every endpoint is scoped to a `programId`. There are no global queries in v1.
2. **Source-agnostic.** The API never exposes which tool the data came from. Jira and Linear look identical on the wire.
3. **Versioned.** All endpoints live under `/api/v1/`. Breaking changes increment the major version. Additive changes (new fields, new optional params) are non-breaking and ship without a version bump.
4. **Standard envelope.** Every response — success or error — uses the same top-level shape: `data`, `meta`, `error`.
5. **Graceful degradation.** If a live data source is unreachable, the API falls back to the program's mock data and sets `meta.source = "mock"`. The frontend renders normally; a banner indicates stale/mock data.
6. **5-minute cache, with one exception.** All GET responses are cached in DynamoDB with a 5-minute TTL. Cache entries are keyed by `{programId}:{endpoint}:{params_hash}`. The `POST /system/cache/invalidate` endpoint busts the cache for a specific program. **`POST /report/generate` bypasses the cache entirely** — each generation is explicitly triggered by the TPM and costs Claude API tokens. It is never served from cache.
7. **Config-driven.** Field-level data source routing is defined in `tpm.config.json` per program. The API reads this config at request time; no config changes require a redeploy.

---

## Standard Response Envelope

Every response — success and error — uses this shape.

```json
{
  "data": {},
  "meta": {
    "programId": "string",
    "source": "live | mock | cached",
    "cachedAt": "ISO 8601 | null",
    "generatedAt": "ISO 8601",
    "version": "v1"
  },
  "error": null
}
```

On error, `data` is `null` and `error` is populated:

```json
{
  "data": null,
  "meta": {
    "programId": "string | null",
    "source": null,
    "cachedAt": null,
    "generatedAt": "ISO 8601",
    "version": "v1"
  },
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description",
    "retryable": true
  }
}
```

---

## Error Codes

| Code | HTTP Status | Retryable | Description |
|---|---|---|---|
| `INVALID_PARAMS` | 400 | false | Missing or malformed request parameters |
| `UNAUTHORIZED` | 401 | false | Missing or invalid auth token |
| `PROGRAM_NOT_FOUND` | 404 | false | No program exists with the given `programId` |
| `NOT_IMPLEMENTED` | 501 | false | Feature is planned for a future version and not available in v1 |
| `RATE_LIMITED` | 429 | true | Upstream source rate limit hit; retry after `Retry-After` header |
| `SOURCE_UNAVAILABLE` | 502 | true | Live data source unreachable; falling back to mock |
| `STALE_DATA` | 200 | false | Cache TTL exceeded and source unavailable; serving last-known data |
| `AI_GENERATION_FAILED` | 500 | true | Claude failed to generate the status report |
| `INTERNAL_ERROR` | 500 | true | Unhandled server error |

---

## Data Field Envelope

Every numeric metric or data point returned by the API is wrapped in a source-audit envelope. This records where the value came from and who last updated it, so the TPM can audit whether a number reflects live tool data, a manual edit, or a mock.

```json
{
  "value": 0,
  "source_at_time": "mock | jira | linear | github | notion | google-sheets",
  "recorded_at": "ISO 8601",
  "updated_by": "system | tpm"
}
```

String fields (IDs, names, titles, statuses) are returned as plain values. Only numeric measurements — points, counts, percentages, durations — use this envelope.

---

## Two-Step Report Flow

Generating a status report is a deliberate, two-step action — not a background sync.

1. **TPM triggers generation.** `POST /report/generate` calls Claude with all current program data and returns a **draft** report immediately. The draft is not saved to history. It is held in a temporary store with a 24-hour expiry.
2. **TPM reviews and optionally edits.** The draft is rendered in the dashboard. The TPM can read it, adjust the tone, and add context that only they know.
3. **TPM approves.** `POST /report/approve` takes the draft `report_id` and any freeform edits, finalizes the report, and saves it to history with `status: "approved"`.
4. **Approved reports are permanent.** Once approved, a report is accessible via `GET /report/history` and `GET /report/:reportId` indefinitely.

**Why two steps?** Report generation costs Claude API tokens and takes 5–10 seconds. Saving automatically would create noise in the history — every accidental click becomes a history entry. The approve step is intentional and cheap (no AI call). Drafts auto-expire after 24 hours to prevent stale drafts from cluttering the temp store.

---

## Endpoints

### Programs

#### `GET /api/v1/programs`

Returns all programs the current user has access to.

**Response `data`:**
```json
{
  "programs": [
    {
      "id": "string",
      "name": "string",
      "type": "product-development | compliance-risk | platform-migration | initiative-okr",
      "status": "green | amber | red",
      "lastUpdated": "ISO 8601",
      "dataSource": "live | mock",
      "sharing": {
        "enabled": false,
        "collaborators": []
      }
    }
  ]
}
```

---

#### `POST /api/v1/programs`

Creates a new program from a template.

**Request body:**
```json
{
  "name": "string",
  "type": "product-development | compliance-risk | platform-migration | initiative-okr",
  "dataMode": "mock | live"
}
```

**Response `data`:**
```json
{
  "id": "string",
  "name": "string",
  "type": "string",
  "dataMode": "string",
  "createdAt": "ISO 8601",
  "configPath": "tpm.config.json"
}
```

---

#### `GET /api/v1/programs/:programId`

Returns metadata and overall health for a single program.

**Response `data`:**
```json
{
  "id": "string",
  "name": "string",
  "type": "string",
  "status": "green | amber | red",
  "statusReason": "string",
  "dataSource": "live | mock",
  "lastUpdated": "ISO 8601",
  "dashboards": ["sprint", "metrics", "roadmap", "report"],
  "sharing": {
    "enabled": false,
    "collaborators": []
  }
}
```

---

#### `PATCH /api/v1/programs/:programId`

Updates program metadata (name, status override, or data mode).

**Request body (all fields optional):**
```json
{
  "name": "string",
  "statusOverride": "green | amber | red | null",
  "dataMode": "mock | live"
}
```

**Response `data`:** Updated program object (same shape as `GET /programs/:programId`).

---

#### `POST /api/v1/programs/:programId/share`

Enables or disables sharing for a program and sets the collaborator role.

> **v1 status:** Returns `NOT_IMPLEMENTED` (501). Planned for v2 when multi-user access ships.

**Request body:**
```json
{
  "enabled": true,
  "role": "viewer | collaborator"
}
```

**Response `data`:**
```json
{
  "sharing": {
    "enabled": true,
    "role": "viewer | collaborator",
    "share_url": "string | null"
  }
}
```

---

#### `GET /api/v1/programs/:programId/collaborators`

Returns all collaborators who have access to the program.

> **v1 status:** Returns `NOT_IMPLEMENTED` (501). Planned for v2 when multi-user access ships.

**Response `data`:**
```json
{
  "collaborators": [
    {
      "id": "string",
      "role": "viewer | collaborator",
      "added_at": "ISO 8601"
    }
  ]
}
```

---

### Data Sources

#### `GET /api/v1/programs/:programId/data-sources`

Returns the current data source for each dashboard and the full history of source changes. Use this to audit when and why a dashboard switched from mock to live (or back).

**Response `data`:**
```json
{
  "current": {
    "sprint": "mock | jira | linear | github",
    "metrics": "mock | github",
    "roadmap": "mock | notion | google-sheets",
    "risks": "mock | notion | google-sheets"
  },
  "history": [
    {
      "dashboard": "sprint",
      "source": "jira",
      "effective_from": "ISO 8601",
      "effective_to": "ISO 8601 | null"
    }
  ]
}
```

---

#### `PATCH /api/v1/programs/:programId/data-sources`

Updates the data source for a single dashboard. Creates a history entry with the previous source's `effective_to` set to now and the new entry's `effective_from` set to the requested date.

**Request body:**
```json
{
  "dashboard": "sprint | metrics | roadmap | risks",
  "source": "mock | jira | linear | github | notion | google-sheets",
  "effective_from": "ISO 8601"
}
```

**Response `data`:**
```json
{
  "updated": {
    "dashboard": "string",
    "source": "string",
    "effective_from": "ISO 8601"
  }
}
```

---

### Sprint Tracker

#### `GET /api/v1/programs/:programId/sprint/current`

Returns the active sprint for the program. Numeric fields use the [data field envelope](#data-field-envelope).

**Response `data`:**
```json
{
  "sprint": {
    "id": "string",
    "name": "string",
    "startDate": "ISO 8601",
    "endDate": "ISO 8601",
    "totalPoints": { "value": 0, "source_at_time": "jira", "recorded_at": "ISO 8601", "updated_by": "system" },
    "completedPoints": { "value": 0, "source_at_time": "jira", "recorded_at": "ISO 8601", "updated_by": "system" },
    "remainingPoints": { "value": 0, "source_at_time": "jira", "recorded_at": "ISO 8601", "updated_by": "system" },
    "completionPercent": { "value": 0, "source_at_time": "jira", "recorded_at": "ISO 8601", "updated_by": "system" },
    "status": "on-track | at-risk | off-track"
  },
  "tickets": [
    {
      "id": "string",
      "title": "string",
      "status": "todo | in-progress | done | blocked",
      "points": { "value": 0, "source_at_time": "jira", "recorded_at": "ISO 8601", "updated_by": "system" },
      "assignee": "string",
      "blockerNote": "string | null"
    }
  ],
  "blockers": [
    {
      "ticketId": "string",
      "title": "string",
      "blockedSince": "ISO 8601",
      "daysBlocked": { "value": 0, "source_at_time": "jira", "recorded_at": "ISO 8601", "updated_by": "system" },
      "owner": "string",
      "note": "string"
    }
  ]
}
```

---

#### `GET /api/v1/programs/:programId/sprint/velocity`

Returns the last 6 sprints for the velocity chart.

**Response `data`:**
```json
{
  "sprints": [
    {
      "name": "string",
      "committed": { "value": 0, "source_at_time": "jira", "recorded_at": "ISO 8601", "updated_by": "system" },
      "completed": { "value": 0, "source_at_time": "jira", "recorded_at": "ISO 8601", "updated_by": "system" },
      "completionRate": { "value": 0, "source_at_time": "jira", "recorded_at": "ISO 8601", "updated_by": "system" }
    }
  ],
  "averageVelocity": { "value": 0, "source_at_time": "jira", "recorded_at": "ISO 8601", "updated_by": "system" },
  "trend": "improving | stable | declining"
}
```

---

#### `PATCH /api/v1/programs/:programId/sprint/tickets/:ticketId`

Updates the status or blocker note on a ticket (mock mode only in v1).

**Request body (all fields optional):**
```json
{
  "status": "todo | in-progress | done | blocked",
  "blockerNote": "string | null"
}
```

**Response `data`:** Updated ticket object.

---

### Engineering Metrics (DORA)

#### `GET /api/v1/programs/:programId/metrics/dora`

Returns the four DORA metrics for the program. Each metric value uses the [data field envelope](#data-field-envelope).

**Query params:** `?period=7d | 30d | 90d` (default: `30d`)

**Response `data`:**
```json
{
  "period": "7d | 30d | 90d",
  "deploymentFrequency": {
    "value": { "value": 0, "source_at_time": "github", "recorded_at": "ISO 8601", "updated_by": "system" },
    "unit": "per day | per week | per month",
    "rating": "elite | high | medium | low"
  },
  "leadTimeForChanges": {
    "value": { "value": 0, "source_at_time": "github", "recorded_at": "ISO 8601", "updated_by": "system" },
    "unit": "hours",
    "rating": "elite | high | medium | low"
  },
  "changeFailureRate": {
    "value": { "value": 0, "source_at_time": "github", "recorded_at": "ISO 8601", "updated_by": "system" },
    "unit": "percent",
    "rating": "elite | high | medium | low"
  },
  "meanTimeToRestore": {
    "value": { "value": 0, "source_at_time": "github", "recorded_at": "ISO 8601", "updated_by": "system" },
    "unit": "hours",
    "rating": "elite | high | medium | low"
  }
}
```

---

#### `GET /api/v1/programs/:programId/metrics/deployments`

Returns deployment history for the sparkline chart.

**Query params:** `?period=7d | 30d | 90d` (default: `30d`)

**Response `data`:**
```json
{
  "deployments": [
    {
      "date": "ISO 8601",
      "count": { "value": 0, "source_at_time": "github", "recorded_at": "ISO 8601", "updated_by": "system" },
      "failures": { "value": 0, "source_at_time": "github", "recorded_at": "ISO 8601", "updated_by": "system" }
    }
  ],
  "total": { "value": 0, "source_at_time": "github", "recorded_at": "ISO 8601", "updated_by": "system" },
  "failureCount": { "value": 0, "source_at_time": "github", "recorded_at": "ISO 8601", "updated_by": "system" }
}
```

---

#### `GET /api/v1/programs/:programId/metrics/incidents`

Returns incident history for the MTTR chart.

**Query params:** `?period=7d | 30d | 90d` (default: `30d`)

**Response `data`:**
```json
{
  "incidents": [
    {
      "id": "string",
      "startedAt": "ISO 8601",
      "resolvedAt": "ISO 8601 | null",
      "durationHours": { "value": 0, "source_at_time": "github", "recorded_at": "ISO 8601", "updated_by": "system" },
      "severity": "p1 | p2 | p3",
      "status": "open | resolved"
    }
  ],
  "openCount": { "value": 0, "source_at_time": "github", "recorded_at": "ISO 8601", "updated_by": "system" },
  "avgResolutionHours": { "value": 0, "source_at_time": "github", "recorded_at": "ISO 8601", "updated_by": "system" }
}
```

---

### Roadmap & OKRs

#### `GET /api/v1/programs/:programId/roadmap/initiatives`

Returns all roadmap initiatives.

**Response `data`:**
```json
{
  "initiatives": [
    {
      "id": "string",
      "title": "string",
      "status": "not-started | in-progress | complete | at-risk",
      "owner": "string",
      "dueDate": "ISO 8601",
      "completionPercent": { "value": 0, "source_at_time": "notion", "recorded_at": "ISO 8601", "updated_by": "tpm" },
      "quarter": "string"
    }
  ]
}
```

---

#### `GET /api/v1/programs/:programId/roadmap/okrs`

Returns OKRs and key result progress.

**Response `data`:**
```json
{
  "objective": "string",
  "quarter": "string",
  "keyResults": [
    {
      "id": "string",
      "title": "string",
      "progress": { "value": 0, "source_at_time": "notion", "recorded_at": "ISO 8601", "updated_by": "tpm" },
      "target": { "value": 0, "source_at_time": "notion", "recorded_at": "ISO 8601", "updated_by": "tpm" },
      "unit": "string",
      "status": "on-track | at-risk | off-track"
    }
  ],
  "overallProgress": { "value": 0, "source_at_time": "notion", "recorded_at": "ISO 8601", "updated_by": "system" }
}
```

---

#### `PATCH /api/v1/programs/:programId/roadmap/initiatives/:initiativeId`

Updates an initiative's status or completion (mock mode only in v1).

**Request body (all fields optional):**
```json
{
  "status": "not-started | in-progress | complete | at-risk",
  "completionPercent": 0,
  "owner": "string"
}
```

**Response `data`:** Updated initiative object.

---

#### `GET /api/v1/programs/:programId/roadmap/risks`

Returns the risk register for the program.

**Response `data`:**
```json
{
  "risks": [
    {
      "id": "string",
      "title": "string",
      "probability": "low | medium | high",
      "impact": "low | medium | high",
      "status": "open | mitigating | closed",
      "owner": "string",
      "mitigationPlan": "string",
      "raisedDate": "ISO 8601",
      "dueDate": "ISO 8601 | null"
    }
  ],
  "openCount": { "value": 0, "source_at_time": "notion", "recorded_at": "ISO 8601", "updated_by": "system" },
  "highPriorityCount": { "value": 0, "source_at_time": "notion", "recorded_at": "ISO 8601", "updated_by": "system" }
}
```

---

#### `PATCH /api/v1/programs/:programId/roadmap/risks/:riskId`

Updates a risk's status or mitigation note (mock mode only in v1).

**Request body (all fields optional):**
```json
{
  "status": "open | mitigating | closed",
  "mitigationPlan": "string",
  "owner": "string"
}
```

**Response `data`:** Updated risk object.

---

### AI Status Report

The report flow is two steps: generate a draft, then approve it. See [Two-Step Report Flow](#two-step-report-flow) for the full explanation.

#### `POST /api/v1/programs/:programId/report/generate`

Triggers Claude to generate a **draft** weekly status report from all connected program data. Reads the current sprint, DORA metrics, roadmap, and risk register. **Bypasses cache — always calls Claude.** Returns the draft immediately; it is not saved to history until approved.

**Request body (all fields optional):**
```json
{
  "weekEndingDate": "ISO 8601",
  "tone": "executive | detailed",
  "includeConfidential": false
}
```

**Response `data`:**
```json
{
  "report_id": "temp_<uuid>",
  "status": "draft",
  "expires_at": "ISO 8601",
  "generatedAt": "ISO 8601",
  "weekEnding": "ISO 8601",
  "ragStatus": "red | amber | green",
  "executiveSummary": "string",
  "keyAccomplishments": ["string"],
  "blockersNeedingEscalation": [
    {
      "title": "string",
      "daysBlocked": 0,
      "owner": "string",
      "recommendedAction": "string"
    }
  ],
  "riskSummary": [
    {
      "title": "string",
      "status": "open | mitigating",
      "owner": "string",
      "mitigationStatus": "string"
    }
  ],
  "upcomingMilestones": [
    {
      "title": "string",
      "dueDate": "ISO 8601",
      "owner": "string",
      "onTrack": true
    }
  ],
  "exportFormats": {
    "markdown": "string",
    "pdfUrl": null
  }
}
```

---

#### `POST /api/v1/programs/:programId/report/approve`

Saves a draft report to history. Optionally accepts freeform edits (appended to the executive summary). No AI call is made at this step.

**Request body:**
```json
{
  "report_id": "temp_<uuid>",
  "edits": "string | null"
}
```

**Response `data`:**
```json
{
  "report": {
    "report_id": "string",
    "status": "approved",
    "approvedAt": "ISO 8601",
    "generatedAt": "ISO 8601",
    "weekEnding": "ISO 8601",
    "ragStatus": "red | amber | green",
    "executiveSummary": "string",
    "keyAccomplishments": ["string"],
    "blockersNeedingEscalation": [
      {
        "title": "string",
        "daysBlocked": 0,
        "owner": "string",
        "recommendedAction": "string"
      }
    ],
    "riskSummary": [
      {
        "title": "string",
        "status": "open | mitigating",
        "owner": "string",
        "mitigationStatus": "string"
      }
    ],
    "upcomingMilestones": [
      {
        "title": "string",
        "dueDate": "ISO 8601",
        "owner": "string",
        "onTrack": true
      }
    ],
    "exportFormats": {
      "markdown": "string",
      "pdfUrl": "string | null"
    }
  }
}
```

---

#### `GET /api/v1/programs/:programId/report/history`

Returns a list of approved status reports for the program. Draft reports do not appear here.

**Query params:** `?limit=10` (default: `10`, max: `50`)

**Response `data`:**
```json
{
  "reports": [
    {
      "report_id": "string",
      "status": "approved",
      "approvedAt": "ISO 8601",
      "generatedAt": "ISO 8601",
      "weekEnding": "ISO 8601",
      "ragStatus": "red | amber | green",
      "executiveSummary": "string"
    }
  ],
  "total": 0
}
```

---

#### `GET /api/v1/programs/:programId/report/:reportId`

Returns a specific approved report by its permanent ID.

**Response `data`:** Full report object (same shape as `POST /report/approve` response `data.report`).

---

### System

#### `GET /api/v1/system/health`

Liveness check. Returns 200 if the API is up. Does not check downstream sources.

**Response `data`:**
```json
{
  "status": "ok",
  "version": "v1",
  "timestamp": "ISO 8601"
}
```

---

#### `GET /api/v1/programs/:programId/system/config`

Returns the resolved data source configuration for a program (which fields are wired to which source). Does not return credentials.

**Response `data`:**
```json
{
  "programId": "string",
  "dataMode": "live | mock",
  "sources": {
    "sprint": {
      "provider": "jira | linear | github | mock",
      "connected": true,
      "lastSync": "ISO 8601 | null"
    },
    "metrics": {
      "provider": "github | mock",
      "connected": true,
      "lastSync": "ISO 8601 | null"
    },
    "roadmap": {
      "provider": "notion | google-sheets | mock",
      "connected": true,
      "lastSync": "ISO 8601 | null"
    },
    "risks": {
      "provider": "notion | google-sheets | mock",
      "connected": true,
      "lastSync": "ISO 8601 | null"
    }
  }
}
```

---

#### `POST /api/v1/programs/:programId/system/cache/invalidate`

Busts the DynamoDB cache for a program. Forces all subsequent GET requests to pull fresh data from the source.

**Request body:** Empty (`{}`)

**Response `data`:**
```json
{
  "programId": "string",
  "invalidatedAt": "ISO 8601",
  "keysCleared": 0
}
```

---

## Data Source Routing

Field-level source routing is defined in `tpm.config.json`. The API resolves the live source at request time. If the live source is unavailable, it falls back to mock without changing the field configuration.

| Domain | Supported live sources | Mock fallback |
|---|---|---|
| Sprint / tickets | Jira, Linear, GitHub Projects | `mock/sprint.json` |
| Deployment metrics | GitHub Actions | `mock/metrics.json` |
| Incident data | PagerDuty, GitHub Issues | `mock/incidents.json` |
| Roadmap / initiatives | Notion, Google Sheets | `mock/roadmap.json` |
| OKRs / key results | Notion, Google Sheets | `mock/okrs.json` |
| Risk register | Notion, Google Sheets | `mock/risks.json` |
| AI reports | Claude API (Anthropic) | None — AI calls never mock |

---

## Lambda Function Mapping

Each domain is handled by a dedicated Lambda function. Functions share no state; all state lives in DynamoDB or S3.

| Function name | Handles |
|---|---|
| `programs-handler` | `GET /programs`, `POST /programs`, `GET /programs/:id`, `PATCH /programs/:id`, `POST /programs/:id/share`, `GET /programs/:id/collaborators`, `GET /programs/:id/data-sources`, `PATCH /programs/:id/data-sources` |
| `sprint-handler` | `GET /sprint/current`, `GET /sprint/velocity`, `PATCH /sprint/tickets/:id` |
| `metrics-handler` | `GET /metrics/dora`, `GET /metrics/deployments`, `GET /metrics/incidents` |
| `roadmap-handler` | `GET /roadmap/initiatives`, `GET /roadmap/okrs`, `PATCH /roadmap/initiatives/:id`, `GET /roadmap/risks`, `PATCH /roadmap/risks/:id` |
| `report-handler` | `POST /report/generate`, `POST /report/approve`, `GET /report/history`, `GET /report/:reportId` |
| `system-handler` | `GET /system/health`, `GET /system/config`, `POST /system/cache/invalidate` |
