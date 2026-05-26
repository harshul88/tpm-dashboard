import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { success, dataPoint } from '../shared/response';
import { buildKey, get, set } from '../shared/cache';
import { getDataSource, getCacheTtl } from '../shared/config';

type Period = '7d' | '30d' | '90d';

export async function getDeployments(
  event: APIGatewayProxyEvent,
  programId: string,
): Promise<APIGatewayProxyResult> {
  const period = (event.queryStringParameters?.period ?? '30d') as Period;
  const src = getDataSource('engMetrics');
  const key = buildKey(programId, 'metrics', 'deployments', period);
  const cached = await get(key);
  if (cached) return success(cached.data, src, true, cached.cachedAt);

  // TODO: fetch GitHub Actions workflow runs for the configured repo
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  const now  = Date.now();
  const deployments = Array.from({ length: days }, (_, i) => ({
    date:     new Date(now - i * 86_400_000).toISOString(),
    count:    dataPoint(Math.floor(Math.random() * 3), src),
    failures: dataPoint(Math.random() < 0.1 ? 1 : 0,  src),
  }));

  const data = {
    deployments,
    total:        dataPoint(deployments.reduce((s, d) => s + d.count.value,    0), src),
    failureCount: dataPoint(deployments.reduce((s, d) => s + d.failures.value, 0), src),
  };

  await set(key, data, getCacheTtl());
  return success(data, src);
}
