import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { success, dataPoint } from '../shared/response';
import { buildKey, get, set } from '../shared/cache';
import { getDataSource, getCacheTtl } from '../shared/config';

type Period = '7d' | '30d' | '90d';

export async function getIncidents(
  event: APIGatewayProxyEvent,
  programId: string,
): Promise<APIGatewayProxyResult> {
  const period = (event.queryStringParameters?.period ?? '30d') as Period;
  const src = getDataSource('engMetrics');
  const key = buildKey(programId, 'metrics', 'incidents', period);
  const cached = await get(key);
  if (cached) return success(cached.data, src, true, cached.cachedAt);

  // TODO: fetch from PagerDuty or GitHub Issues based on config
  const now = new Date().toISOString();
  const data = {
    incidents: [
      {
        id: 'inc-001',
        startedAt: now,
        resolvedAt: now,
        durationHours: dataPoint(1.2, src),
        severity: 'p2',
        status: 'resolved',
      },
    ],
    openCount:          dataPoint(0,   src),
    avgResolutionHours: dataPoint(1.2, src),
  };

  await set(key, data, getCacheTtl());
  return success(data, src);
}
