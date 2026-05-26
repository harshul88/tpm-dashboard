import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { success } from '../shared/response';
import { buildKey, get, set } from '../shared/cache';
import { getCacheTtl } from '../shared/config';

export async function listPrograms(
  _event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  const key = buildKey('global', 'programs');
  const cached = await get(key);
  if (cached) return success(cached.data, 'mock', true, cached.cachedAt);

  // TODO: query DynamoDB programs table
  const data = { programs: [] };

  await set(key, data, getCacheTtl());
  return success(data, 'mock');
}
