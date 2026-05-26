import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { success, dataPoint } from '../shared/response';
import { buildKey, get, set } from '../shared/cache';
import { getDataSource, getCacheTtl } from '../shared/config';

export async function getVelocity(
  _event: APIGatewayProxyEvent,
  programId: string,
): Promise<APIGatewayProxyResult> {
  const src = getDataSource('sprintTracker');
  const key = buildKey(programId, 'sprint', 'velocity');
  const cached = await get(key);
  if (cached) return success(cached.data, src, true, cached.cachedAt);

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

  await set(key, data, getCacheTtl());
  return success(data, src);
}
