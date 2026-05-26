import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ok } from '../shared/response';
import { dataPoint } from '../shared/response';
import { cacheKey, cacheGet, cachePut } from '../shared/cache';
import { getConfig } from '../shared/config';

type Period = '7d' | '30d' | '90d';

export async function getDeployments(
  event: APIGatewayProxyEvent,
  programId: string,
): Promise<APIGatewayProxyResult> {
  const period = (event.queryStringParameters?.period ?? '30d') as Period;
  const key = cacheKey(programId, 'metrics-deployments', { period });
  const cached = await cacheGet<unknown>(key);
  if (cached) {
    return ok(cached.data, { programId, source: 'cached', cachedAt: cached.cachedAt });
  }

  const config = getConfig();
  const src = config.integrations.github.enabled ? 'github' : 'mock';

  // TODO: fetch GitHub Actions workflow runs for the configured repo
  const now = Date.now();
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  const deployments = Array.from({ length: days }, (_, i) => ({
    date: new Date(now - i * 86_400_000).toISOString(),
    count: dataPoint(Math.floor(Math.random() * 3), src),
    failures: dataPoint(Math.random() < 0.1 ? 1 : 0, src),
  }));

  const data = {
    deployments,
    total: dataPoint(deployments.reduce((s, d) => s + d.count.value, 0), src),
    failureCount: dataPoint(deployments.reduce((s, d) => s + d.failures.value, 0), src),
  };

  await cachePut(key, data);
  return ok(data, { programId, source: src === 'mock' ? 'mock' : 'live' });
}
