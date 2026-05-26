import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ok } from '../shared/response';
import { dataPoint } from '../shared/response';
import { cacheKey, cacheGet, cachePut } from '../shared/cache';
import { getConfig } from '../shared/config';

type Period = '7d' | '30d' | '90d';

export async function getDora(
  event: APIGatewayProxyEvent,
  programId: string,
): Promise<APIGatewayProxyResult> {
  const period = (event.queryStringParameters?.period ?? '30d') as Period;
  const key = cacheKey(programId, 'metrics-dora', { period });
  const cached = await cacheGet<unknown>(key);
  if (cached) {
    return ok(cached.data, { programId, source: 'cached', cachedAt: cached.cachedAt });
  }

  const config = getConfig();
  const src = config.integrations.github.enabled ? 'github' : 'mock';

  // TODO: fetch from GitHub Actions API when src === 'github'
  const data = {
    period,
    deploymentFrequency: {
      value: dataPoint(4.2, src),
      unit: 'per week',
      rating: 'high',
    },
    leadTimeForChanges: {
      value: dataPoint(18, src),
      unit: 'hours',
      rating: 'high',
    },
    changeFailureRate: {
      value: dataPoint(3.1, src),
      unit: 'percent',
      rating: 'elite',
    },
    meanTimeToRestore: {
      value: dataPoint(1.4, src),
      unit: 'hours',
      rating: 'elite',
    },
  };

  await cachePut(key, data);
  return ok(data, { programId, source: src === 'mock' ? 'mock' : 'live' });
}
