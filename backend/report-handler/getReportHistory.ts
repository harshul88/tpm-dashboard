import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { success } from '../shared/response';
import { buildKey, get, set } from '../shared/cache';
import { getCacheTtl } from '../shared/config';

export async function getReportHistory(
  event: APIGatewayProxyEvent,
  programId: string,
): Promise<APIGatewayProxyResult> {
  const limit = Math.min(Number(event.queryStringParameters?.limit ?? 10), 50);
  const key   = buildKey(programId, 'report', 'history', String(limit));
  const cached = await get(key);
  if (cached) return success(cached.data, 'mock', true, cached.cachedAt);

  // TODO: query DynamoDB report history table ordered by approvedAt desc
  const data = { reports: [], total: 0 };

  await set(key, data, getCacheTtl());
  return success(data, 'mock');
}
