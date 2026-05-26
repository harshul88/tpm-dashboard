import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ok } from '../shared/response';
import { cacheKey, cacheGet, cachePut } from '../shared/cache';

export async function getReportHistory(
  event: APIGatewayProxyEvent,
  programId: string,
): Promise<APIGatewayProxyResult> {
  const limit = Math.min(Number(event.queryStringParameters?.limit ?? 10), 50);
  const key = cacheKey(programId, 'report-history', { limit });
  const cached = await cacheGet<unknown>(key);
  if (cached) {
    return ok(cached.data, { programId, source: 'cached', cachedAt: cached.cachedAt });
  }

  // TODO: query DynamoDB report history table for this programId, ordered by approvedAt desc
  const data = { reports: [], total: 0 };

  await cachePut(key, data);
  return ok(data, { programId, source: 'mock' });
}
