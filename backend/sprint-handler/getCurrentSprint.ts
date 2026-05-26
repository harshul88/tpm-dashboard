import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { success, dataPoint } from '../shared/response';
import { buildKey, get, set } from '../shared/cache';
import { getDataSource, getCacheTtl } from '../shared/config';

export async function getCurrentSprint(
  _event: APIGatewayProxyEvent,
  programId: string,
): Promise<APIGatewayProxyResult> {
  const src = getDataSource('sprintTracker');
  const key = buildKey(programId, 'sprint', 'current');
  const cached = await get(key);
  if (cached) return success(cached.data, src, true, cached.cachedAt);

  // TODO: branch on src to call Jira / Linear / GitHub Projects API
  const now = new Date().toISOString();
  const data = {
    sprint: {
      id: 'sprint-1',
      name: 'Sprint 1',
      startDate: now,
      endDate: now,
      totalPoints:      dataPoint(40, src),
      completedPoints:  dataPoint(24, src),
      remainingPoints:  dataPoint(16, src),
      completionPercent: dataPoint(60, src),
      status: 'on-track',
    },
    tickets: [],
    blockers: [],
  };

  await set(key, data, getCacheTtl());
  return success(data, src);
}
