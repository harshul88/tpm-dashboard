import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ok, err } from '../shared/response';
import { ErrorCode, ApiError } from '../shared/errors';
import { cacheKey, cacheGet, cachePut } from '../shared/cache';

export async function getProgram(
  _event: APIGatewayProxyEvent,
  programId: string,
): Promise<APIGatewayProxyResult> {
  const key = cacheKey(programId, 'get-program');
  const cached = await cacheGet<unknown>(key);
  if (cached) {
    return ok(cached.data, { programId, source: 'cached', cachedAt: cached.cachedAt });
  }

  // TODO: fetch from DynamoDB programs table
  // throw new ApiError(ErrorCode.PROGRAM_NOT_FOUND, `Program ${programId} not found`);
  void ApiError; // imported for future use

  const data = {
    id: programId,
    name: 'Untitled Program',
    type: 'product-development',
    status: 'green',
    statusReason: 'All systems nominal',
    dataSource: 'mock',
    lastUpdated: new Date().toISOString(),
    dashboards: ['sprint', 'metrics', 'roadmap', 'report'],
    sharing: { enabled: false, collaborators: [] },
  };

  await cachePut(key, data);
  return ok(data, { programId, source: 'mock' });
}

export { err, ErrorCode };
