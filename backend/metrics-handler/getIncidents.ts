import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ok } from '../shared/response';
import { dataPoint } from '../shared/response';
import { cacheKey, cacheGet, cachePut } from '../shared/cache';
import { getConfig } from '../shared/config';

type Period = '7d' | '30d' | '90d';

export async function getIncidents(
  event: APIGatewayProxyEvent,
  programId: string,
): Promise<APIGatewayProxyResult> {
  const period = (event.queryStringParameters?.period ?? '30d') as Period;
  const key = cacheKey(programId, 'metrics-incidents', { period });
  const cached = await cacheGet<unknown>(key);
  if (cached) {
    return ok(cached.data, { programId, source: 'cached', cachedAt: cached.cachedAt });
  }

  const config = getConfig();
  const src = config.integrations.pagerduty.enabled ? 'github' : 'mock';

  // TODO: fetch from PagerDuty or GitHub Issues depending on config
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
    openCount: dataPoint(0, src),
    avgResolutionHours: dataPoint(1.2, src),
  };

  await cachePut(key, data);
  return ok(data, { programId, source: src === 'mock' ? 'mock' : 'live' });
}
