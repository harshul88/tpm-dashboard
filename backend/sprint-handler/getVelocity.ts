import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ok } from '../shared/response';
import { dataPoint } from '../shared/response';
import { cacheKey, cacheGet, cachePut } from '../shared/cache';
import { getConfig } from '../shared/config';

export async function getVelocity(
  _event: APIGatewayProxyEvent,
  programId: string,
): Promise<APIGatewayProxyResult> {
  const key = cacheKey(programId, 'sprint-velocity');
  const cached = await cacheGet<unknown>(key);
  if (cached) {
    return ok(cached.data, { programId, source: 'cached', cachedAt: cached.cachedAt });
  }

  const config = getConfig();
  const src = config.defaults.dataSources.sprintTracker as 'mock' | 'jira' | 'linear' | 'github';

  // TODO: fetch last 6 sprints from source
  const data = {
    sprints: [
      { name: 'Sprint 1', committed: dataPoint(40, src), completed: dataPoint(36, src), completionRate: dataPoint(90, src) },
      { name: 'Sprint 2', committed: dataPoint(38, src), completed: dataPoint(32, src), completionRate: dataPoint(84, src) },
      { name: 'Sprint 3', committed: dataPoint(42, src), completed: dataPoint(40, src), completionRate: dataPoint(95, src) },
    ],
    averageVelocity: dataPoint(36, src),
    trend: 'improving',
  };

  await cachePut(key, data);
  return ok(data, { programId, source: src === 'mock' ? 'mock' : 'live' });
}
