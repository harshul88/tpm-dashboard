import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { success, notImplemented } from '../shared/response';
import { buildKey, get, set } from '../shared/cache';
import { getDataSource, getCacheTtl } from '../shared/config';

const MOCK_PATH = process.env.MOCK_DATA_PATH ?? join(process.cwd(), 'src/data');

type DoraRating = 'elite' | 'high' | 'medium' | 'low';

interface DeploymentRow {
  date: string;
  deploys_count: number;
  success_count: number;
  failed_count: number;
}

interface IncidentRow {
  id: string;
  title: string;
  severity: string;
  opened_at: string;
  resolved_at: string | null;
  status: string;
}

interface PullRequestRow {
  id: string;
  title: string;
  created_at: string;
  merged_at: string;
  deployed_at: string;
}

interface DoraMetric {
  value: number;
  unit: string;
  rating: DoraRating;
}

function cutoffMs(days: number): number {
  return Date.now() - days * 24 * 60 * 60 * 1000;
}

// 2024 DORA benchmarks — Deployment Frequency
function deployFreqRating(perDay: number): DoraRating {
  if (perDay > 1)       return 'elite';   // multiple times per day
  if (perDay > 1 / 7)   return 'high';    // between once/day and once/week
  if (perDay > 1 / 30)  return 'medium';  // between once/week and once/month
  return 'low';
}

// Lead Time for Changes (hours)
function leadTimeRating(hours: number): DoraRating {
  if (hours < 1)    return 'elite';   // < 1 hour
  if (hours < 168)  return 'high';    // < 1 week
  if (hours < 720)  return 'medium';  // < 1 month
  return 'low';
}

// Change Failure Rate (percentage)
function cfrRating(pct: number): DoraRating {
  if (pct <= 5)   return 'elite';
  if (pct <= 10)  return 'high';
  if (pct <= 15)  return 'medium';
  return 'low';
}

// Mean Time to Restore (hours)
function mttrRating(hours: number): DoraRating {
  if (hours < 1)    return 'elite';   // < 1 hour
  if (hours < 24)   return 'high';    // < 1 day
  if (hours < 168)  return 'medium';  // < 1 week
  return 'low';
}

function calcDeploymentFrequency(rows: DeploymentRow[], cutoff: number, days: number): DoraMetric {
  const inWindow = rows.filter((r) => new Date(r.date).getTime() >= cutoff);
  const total = inWindow.reduce((s, r) => s + r.deploys_count, 0);
  const perDay = days > 0 ? total / days : 0;
  return {
    value: Math.round(perDay * 100) / 100,
    unit: 'per day',
    rating: deployFreqRating(perDay),
  };
}

function calcLeadTime(prs: PullRequestRow[], cutoff: number): DoraMetric {
  const inWindow = prs.filter((pr) => new Date(pr.deployed_at).getTime() >= cutoff);
  const MS_PER_HOUR = 3_600_000;
  const leadTimes = inWindow.map(
    (pr) => (new Date(pr.deployed_at).getTime() - new Date(pr.created_at).getTime()) / MS_PER_HOUR,
  );
  const avg = leadTimes.length > 0
    ? leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length
    : 0;
  return {
    value: Math.round(avg * 10) / 10,
    unit: 'hours',
    rating: leadTimeRating(avg),
  };
}

function calcChangeFailureRate(rows: DeploymentRow[], cutoff: number): DoraMetric {
  const inWindow = rows.filter((r) => new Date(r.date).getTime() >= cutoff);
  const total   = inWindow.reduce((s, r) => s + r.deploys_count, 0);
  const failed  = inWindow.reduce((s, r) => s + r.failed_count, 0);
  const pct = total > 0 ? (failed / total) * 100 : 0;
  return {
    value: Math.round(pct * 10) / 10,
    unit: 'percent',
    rating: cfrRating(pct),
  };
}

function calcMttr(incidents: IncidentRow[], cutoff: number): DoraMetric {
  const MS_PER_HOUR = 3_600_000;
  const resolved = incidents.filter(
    (i) =>
      i.status === 'resolved' &&
      i.resolved_at !== null &&
      new Date(i.opened_at).getTime() >= cutoff,
  );
  const durations = resolved.map(
    (i) =>
      (new Date(i.resolved_at!).getTime() - new Date(i.opened_at).getTime()) / MS_PER_HOUR,
  );
  const avg = durations.length > 0
    ? durations.reduce((a, b) => a + b, 0) / durations.length
    : 0;
  return {
    value: Math.round(avg * 10) / 10,
    unit: 'hours',
    rating: mttrRating(avg),
  };
}

export async function getDora(
  event: APIGatewayProxyEvent,
  programId: string,
): Promise<APIGatewayProxyResult> {
  const src = getDataSource('engMetrics');

  const daysParam = event.queryStringParameters?.days;
  const days = daysParam ? Math.max(1, parseInt(daysParam, 10)) : 30;
  const key = buildKey(programId, 'metrics', 'dora', String(days));

  const cached = await get(key);
  if (cached) return success(cached.data, src, true, cached.cachedAt);

  if (src !== 'mock') return notImplemented(`metrics/dora from source: ${src}`);

  const deployments = JSON.parse(
    readFileSync(join(MOCK_PATH, 'deployments.json'), 'utf-8'),
  ) as DeploymentRow[];

  const incidents = JSON.parse(
    readFileSync(join(MOCK_PATH, 'incidents.json'), 'utf-8'),
  ) as IncidentRow[];

  const prs = JSON.parse(
    readFileSync(join(MOCK_PATH, 'pull_requests.json'), 'utf-8'),
  ) as PullRequestRow[];

  const cutoff = cutoffMs(days);

  const data = {
    period_days: days,
    deployment_frequency: calcDeploymentFrequency(deployments, cutoff, days),
    lead_time_for_changes: calcLeadTime(prs, cutoff),
    change_failure_rate: calcChangeFailureRate(deployments, cutoff),
    mean_time_to_restore: calcMttr(incidents, cutoff),
  };

  await set(key, data, getCacheTtl());
  return success(data, src);
}
