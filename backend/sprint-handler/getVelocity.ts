import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { success, notImplemented } from '../shared/response';
import { buildKey, get, set } from '../shared/cache';
import { getDataSource, getCacheTtl } from '../shared/config';

const MOCK_PATH = process.env.MOCK_DATA_PATH ?? join(process.cwd(), 'src/data');

interface RawSprint {
  id: string;
  name: string;
  committedPoints: number;
  completedPoints: number;
  isActive: boolean;
}

type Trend = 'improving' | 'declining' | 'stable';

function calcTrend(completedVelocities: number[]): Trend {
  if (completedVelocities.length < 6) return 'stable';
  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const last3 = avg(completedVelocities.slice(-3));
  const prev3 = avg(completedVelocities.slice(-6, -3));
  if (prev3 === 0) return 'stable';
  const ratio = last3 / prev3;
  if (ratio > 1.1) return 'improving';
  if (ratio < 0.9) return 'declining';
  return 'stable';
}

export async function getVelocity(
  event: APIGatewayProxyEvent,
  programId: string,
): Promise<APIGatewayProxyResult> {
  const src = getDataSource('sprintTracker');
  const key = buildKey(programId, 'sprint', 'velocity');

  const cached = await get(key);
  if (cached) return success(cached.data, src, true, cached.cachedAt);

  if (src !== 'mock') return notImplemented(`sprint/velocity from source: ${src}`);

  const limitParam = event.queryStringParameters?.limit;
  const limit = limitParam ? Math.max(1, parseInt(limitParam, 10)) : 6;

  const rawSprints = JSON.parse(
    readFileSync(join(MOCK_PATH, 'sprints.json'), 'utf-8'),
  ) as RawSprint[];

  // Sort ascending by id ("sprint-1", "sprint-2", ...) then take last N
  const sorted = [...rawSprints].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
  const slice = sorted.slice(-limit);

  const sprints = slice.map((s) => ({
    id: s.id,
    name: s.name,
    committed: s.committedPoints,
    completed: s.completedPoints,
    completion_rate:
      s.committedPoints > 0
        ? Math.round((s.completedPoints / s.committedPoints) * 100)
        : 0,
    status: (s.isActive ? 'active' : 'done') as 'active' | 'done',
  }));

  // Average velocity computed over completed sprints only
  const completedVelocities = sorted
    .filter((s) => !s.isActive)
    .map((s) => s.completedPoints);

  const average_velocity =
    completedVelocities.length > 0
      ? Math.round(
          completedVelocities.reduce((a, b) => a + b, 0) / completedVelocities.length,
        )
      : 0;

  // Trend uses all completed sprints for context (not just the limit slice)
  const trend: Trend = calcTrend(completedVelocities);

  const data = { sprints, average_velocity, trend };

  await set(key, data, getCacheTtl());
  return success(data, src);
}
