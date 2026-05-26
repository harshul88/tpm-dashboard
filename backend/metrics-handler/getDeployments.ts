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

export async function getDeployments(
  event: APIGatewayProxyEvent,
  programId: string,
): Promise<APIGatewayProxyResult> {
  const src = getDataSource('engMetrics');

  const daysParam = event.queryStringParameters?.days;
  const days = daysParam ? Math.max(1, parseInt(daysParam, 10)) : 30;
  const key = buildKey(programId, 'metrics', 'deployments', String(days));

  const cached = await get(key);
  if (cached) return success(cached.data, src, true, cached.cachedAt);

  if (src !== 'mock') return notImplemented(`metrics/deployments from source: ${src}`);

  const allRows = JSON.parse(
    readFileSync(join(MOCK_PATH, 'deployments.json'), 'utf-8'),
  ) as DeploymentRow[];

  const cutoffMs = Date.now() - days * 24 * 60 * 60 * 1000;
  const rows = allRows
    .filter((r) => new Date(r.date).getTime() >= cutoffMs)
    .sort((a, b) => a.date.localeCompare(b.date));

  const total_deploys  = rows.reduce((s, r) => s + r.deploys_count,  0);
  const total_success  = rows.reduce((s, r) => s + r.success_count,  0);
  const total_failed   = rows.reduce((s, r) => s + r.failed_count,   0);
  const success_rate   = total_deploys > 0
    ? Math.round((total_success / total_deploys) * 1000) / 10  // one decimal
    : 100;

  const data = {
    period_days: days,
    deployments: rows.map((r) => ({
      date:          r.date,
      deploys_count: r.deploys_count,
      success_count: r.success_count,
      failed_count:  r.failed_count,
    })),
    summary: {
      total_deploys,
      total_success,
      total_failed,
      success_rate,
    },
  };

  await set(key, data, getCacheTtl());
  return success(data, src);
}
