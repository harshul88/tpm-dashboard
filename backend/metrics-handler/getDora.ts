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
  opened_at: string;
  resolved_at: string | null;
  status: string;
}

interface PullRequestRow {
  id: string;
  created_at: string;
  deployed_at: string;
}

interface Trend {
  direction: 'up' | 'down' | 'stable';
  pct: number;
}

interface DoraMetric {
  value: number;
  unit: string;
  tier: DoraRating;
  trend: Trend;
}

const TIER_RANK: Record<DoraRating, number> = { elite: 4, high: 3, medium: 2, low: 1 };

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function calcTrend(current: number, previous: number): Trend {
  if (previous === 0) {
    return { direction: current > 0 ? 'up' : 'stable', pct: 0 };
  }
  const pct = Math.round(((current - previous) / previous) * 1000) / 10;
  const direction: Trend['direction'] = pct > 5 ? 'up' : pct < -5 ? 'down' : 'stable';
  return { direction, pct };
}

function overallTier(tiers: DoraRating[]): DoraRating {
  return tiers.reduce(
    (worst, t) => (TIER_RANK[t] < TIER_RANK[worst] ? t : worst),
    'elite' as DoraRating,
  );
}

// --- Deployment Frequency ---

function deployFreqTier(perDay: number): DoraRating {
  if (perDay > 1)      return 'elite';   // > 1 deploy/day
  if (perDay > 1 / 7)  return 'high';    // > 1/week
  if (perDay > 1 / 30) return 'medium';  // > 1/month
  return 'low';
}

function deployFreqInWindow(rows: DeploymentRow[], fromMs: number, toMs: number): number {
  return rows
    .filter((r) => {
      const t = new Date(r.date).getTime();
      return t >= fromMs && t < toMs;
    })
    .reduce((s, r) => s + r.deploys_count, 0);
}

// --- Lead Time (days, p50) ---

function leadTimeTier(days: number): DoraRating {
  if (days < 1)  return 'elite';   // < 1 day
  if (days < 7)  return 'high';    // 1 day – 1 week
  if (days < 30) return 'medium';  // 1 week – 1 month
  return 'low';
}

function leadTimesInWindow(prs: PullRequestRow[], fromMs: number, toMs: number): number[] {
  const MS_PER_DAY = 86_400_000;
  return prs
    .filter((pr) => {
      const t = new Date(pr.deployed_at).getTime();
      return t >= fromMs && t < toMs;
    })
    .map((pr) =>
      (new Date(pr.deployed_at).getTime() - new Date(pr.created_at).getTime()) / MS_PER_DAY,
    );
}

// --- MTTR (minutes) ---

function mttrTier(minutes: number): DoraRating {
  if (minutes < 60)    return 'elite';   // < 1 hour
  if (minutes < 1440)  return 'high';    // < 1 day
  if (minutes < 10080) return 'medium';  // < 1 week
  return 'low';
}

function mttrInWindow(incidents: IncidentRow[], fromMs: number, toMs: number): number[] {
  const MS_PER_MIN = 60_000;
  return incidents
    .filter(
      (i) =>
        i.status === 'resolved' &&
        i.resolved_at !== null &&
        new Date(i.opened_at).getTime() >= fromMs &&
        new Date(i.opened_at).getTime() < toMs,
    )
    .map(
      (i) =>
        (new Date(i.resolved_at!).getTime() - new Date(i.opened_at).getTime()) / MS_PER_MIN,
    );
}

// --- Change Failure Rate ---

function cfrTier(pct: number): DoraRating {
  if (pct <= 5)  return 'elite';
  if (pct <= 10) return 'high';
  if (pct <= 15) return 'medium';
  return 'low';
}

function cfrInWindow(rows: DeploymentRow[], fromMs: number, toMs: number): number {
  const inWindow = rows.filter((r) => {
    const t = new Date(r.date).getTime();
    return t >= fromMs && t < toMs;
  });
  const total  = inWindow.reduce((s, r) => s + r.deploys_count, 0);
  const failed = inWindow.reduce((s, r) => s + r.failed_count, 0);
  return total > 0 ? (failed / total) * 100 : 0;
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

  const now     = Date.now();
  const MS      = (d: number) => d * 86_400_000;
  const curFrom = now - MS(days);
  const curTo   = now;
  const prevFrom = now - MS(days * 2);
  const prevTo   = now - MS(days);

  // Deployment frequency
  const curDF  = deployFreqInWindow(deployments, curFrom, curTo)  / days;
  const prevDF = deployFreqInWindow(deployments, prevFrom, prevTo) / days;
  const deployment_frequency: DoraMetric = {
    value: Math.round(curDF * 100) / 100,
    unit: 'per_day',
    tier: deployFreqTier(curDF),
    trend: calcTrend(curDF, prevDF),
  };

  // Lead time (p50, days)
  const curLT  = leadTimesInWindow(prs, curFrom, curTo);
  const prevLT = leadTimesInWindow(prs, prevFrom, prevTo);
  const curLTp50  = median(curLT);
  const prevLTp50 = median(prevLT);
  const lead_time: DoraMetric = {
    value: Math.round(curLTp50 * 10) / 10,
    unit: 'days',
    tier: leadTimeTier(curLTp50),
    trend: calcTrend(curLTp50, prevLTp50),
  };

  // MTTR (average, minutes)
  const curMTTR  = mttrInWindow(incidents, curFrom, curTo);
  const prevMTTR = mttrInWindow(incidents, prevFrom, prevTo);
  const avgCurMTTR  = curMTTR.length  > 0 ? curMTTR.reduce((a, b)  => a + b, 0) / curMTTR.length  : 0;
  const avgPrevMTTR = prevMTTR.length > 0 ? prevMTTR.reduce((a, b) => a + b, 0) / prevMTTR.length : 0;
  const mttr: DoraMetric = {
    value: Math.round(avgCurMTTR * 10) / 10,
    unit: 'minutes',
    tier: mttrTier(avgCurMTTR),
    trend: calcTrend(avgCurMTTR, avgPrevMTTR),
  };

  // Change failure rate
  const curCFR  = cfrInWindow(deployments, curFrom, curTo);
  const prevCFR = cfrInWindow(deployments, prevFrom, prevTo);
  const change_failure_rate: DoraMetric = {
    value: Math.round(curCFR * 10) / 10,
    unit: 'percent',
    tier: cfrTier(curCFR),
    trend: calcTrend(curCFR, prevCFR),
  };

  const data = {
    period_days: days,
    deployment_frequency,
    lead_time,
    mttr,
    change_failure_rate,
    overall_tier: overallTier([
      deployment_frequency.tier,
      lead_time.tier,
      mttr.tier,
      change_failure_rate.tier,
    ]),
  };

  await set(key, data, getCacheTtl());
  return success(data, src);
}
