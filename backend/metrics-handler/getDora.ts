import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { success, dataPoint } from '../shared/response';
import { buildKey, get, set } from '../shared/cache';
import { getDataSource, getCacheTtl } from '../shared/config';

type Period = '7d' | '30d' | '90d';

export async function getDora(
  event: APIGatewayProxyEvent,
  programId: string,
): Promise<APIGatewayProxyResult> {
  const period = (event.queryStringParameters?.period ?? '30d') as Period;
  const src = getDataSource('engMetrics');
  const key = buildKey(programId, 'metrics', 'dora', period);
  const cached = await get(key);
  if (cached) return success(cached.data, src, true, cached.cachedAt);

  // TODO: fetch from GitHub Actions API when src === 'github'
  const data = {
    period,
    deploymentFrequency:  { value: dataPoint(4.2, src), unit: 'per week',  rating: 'high'  },
    leadTimeForChanges:   { value: dataPoint(18,  src), unit: 'hours',     rating: 'high'  },
    changeFailureRate:    { value: dataPoint(3.1, src), unit: 'percent',   rating: 'elite' },
    meanTimeToRestore:    { value: dataPoint(1.4, src), unit: 'hours',     rating: 'elite' },
  };

  await set(key, data, getCacheTtl());
  return success(data, src);
}
