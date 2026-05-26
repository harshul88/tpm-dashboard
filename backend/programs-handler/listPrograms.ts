import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ok } from '../shared/response';
import { cacheKey, cacheGet, cachePut } from '../shared/cache';

export async function listPrograms(
  _event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  const key = cacheKey('global', 'list-programs');
  const cached = await cacheGet<unknown>(key);
  if (cached) {
    return ok(cached.data, { programId: null, source: 'cached', cachedAt: cached.cachedAt });
  }

  // TODO: query DynamoDB programs table
  const data = { programs: [] };

  await cachePut(key, data);
  return ok(data, { programId: null, source: 'mock' });
}
