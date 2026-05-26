import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { success, notImplemented } from '../shared/response';
import { buildKey, get, set } from '../shared/cache';
import { getDataSource, getCacheTtl } from '../shared/config';

const MOCK_PATH = process.env.MOCK_DATA_PATH ?? join(process.cwd(), 'src/data');

interface DeploymentRow {
  date: string;
  deploys_count: number;
  success_count: number;
  failed_count: number;
}

interface PullRequestRow {
  id: string;
  created_at: string;
  deployed_at: string;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

export async function getDeployments(
  event: APIGatewayProxyEvent,
  programId: string,
): Promise<APIGatewayProxyResult> {
  const src = getDataSource('engMetrics');

  const daysParam = event.queryStringParameters?.days;
  const days = daysParam ? Math.max(1, parseInt(daysParam, 10)) : 28;
  const env  = event.queryStringParameters?.env ?? null;

  const key = buildKey(programId, 'metrics', 'deployments', String(days), env ?? 'all');

  const cached = await get(key);
  if (cached) return success(cached.data, src, true, cached.cachedAt);

  if (src !== 'mock') return notImplemented(`metrics/deployments from source: ${src}`);

  const allDeployments = JSON.parse(
    readFileSync(join(MOCK_PATH, 'deployments.json'), 'utf-8'),
  ) as DeploymentRow[];

  const allPrs = JSON.parse(
    readFileSync(join(MOCK_PATH, 'pull_requests.json'), 'utf-8'),
  ) as PullRequestRow[];

  const cutoffMs = Date.now() - days * 86_400_000;
  const MS_PER_DAY = 86_400_000;

  // Group PRs by deploy date for p50 lead time per day
  const prsByDate = new Map<string, number[]>();
  for (const pr of allPrs) {
    const date = pr.deployed_at.split('T')[0];
    const leadDays =
      (new Date(pr.deployed_at).getTime() - new Date(pr.created_at).getTime()) / MS_PER_DAY;
    const bucket = prsByDate.get(date) ?? [];
    bucket.push(leadDays);
    prsByDate.set(date, bucket);
  }

  const rows = allDeployments
    .filter((r) => new Date(r.date).getTime() >= cutoffMs)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((r) => ({
      date:          r.date,
      total:         r.deploys_count,
      success:       r.success_count,
      failed:        r.failed_count,
      success_rate:
        r.deploys_count > 0
          ? Math.round((r.success_count / r.deploys_count) * 1000) / 10
          : 100,
      lead_time_p50: Math.round(median(prsByDate.get(r.date) ?? []) * 10) / 10,
    }));

  // env filter: mock data has no env field — if env param given, pass through unfiltered
  // (live source like GitHub Actions would filter by environment name)

  const total_deploys  = rows.reduce((s, r) => s + r.total,  0);
  const total_failed   = rows.reduce((s, r) => s + r.failed, 0);
  const overall_success_rate =
    total_deploys > 0
      ? Math.round(((total_deploys - total_failed) / total_deploys) * 1000) / 10
      : 100;

  const peak = rows.reduce(
    (best, r) => (r.total > best.total ? r : best),
    { date: '', total: -1, success: 0, failed: 0, success_rate: 0, lead_time_p50: 0 },
  );

  const data = {
    period_days: days,
    env: env ?? 'all',
    deployments: rows,
    summary: {
      total_deploys,
      total_failed,
      overall_success_rate,
      peak_deploy_day: peak.date,
    },
  };

  await set(key, data, getCacheTtl());
  return success(data, src);
}
