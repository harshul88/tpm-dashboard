import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ok } from '../shared/response';
import { dataPoint } from '../shared/response';
import { cacheKey, cacheGet, cachePut } from '../shared/cache';
import { getConfig } from '../shared/config';

export async function getCurrentSprint(
  _event: APIGatewayProxyEvent,
  programId: string,
): Promise<APIGatewayProxyResult> {
  const key = cacheKey(programId, 'sprint-current');
  const cached = await cacheGet<unknown>(key);
  if (cached) {
    return ok(cached.data, { programId, source: 'cached', cachedAt: cached.cachedAt });
  }

  const config = getConfig();
  const sourceProvider = config.defaults.dataSources.sprintTracker as
    | 'mock'
    | 'jira'
    | 'linear'
    | 'github';

  // TODO: branch on sourceProvider to call Jira / Linear / GitHub API
  const now = new Date().toISOString();
  const data = {
    sprint: {
      id: 'sprint-1',
      name: 'Sprint 1',
      startDate: now,
      endDate: now,
      totalPoints: dataPoint(40, sourceProvider),
      completedPoints: dataPoint(24, sourceProvider),
      remainingPoints: dataPoint(16, sourceProvider),
      completionPercent: dataPoint(60, sourceProvider),
      status: 'on-track',
    },
    tickets: [],
    blockers: [],
  };

  await cachePut(key, data);
  return ok(data, { programId, source: sourceProvider === 'mock' ? 'mock' : 'live' });
}
