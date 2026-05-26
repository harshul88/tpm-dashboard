import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ok, err } from '../shared/response';
import { ErrorCode } from '../shared/errors';
import { cacheKey, cacheGet } from '../shared/cache';

export async function getReport(
  _event: APIGatewayProxyEvent,
  programId: string,
  reportId: string,
): Promise<APIGatewayProxyResult> {
  const key = cacheKey(programId, `report-${reportId}`);
  const cached = await cacheGet<unknown>(key);
  if (cached) {
    return ok(cached.data, { programId, source: 'cached', cachedAt: cached.cachedAt });
  }

  // TODO: fetch approved report from DynamoDB by reportId
  // If not found: throw new ApiError(ErrorCode.PROGRAM_NOT_FOUND, `Report ${reportId} not found`)
  return err(ErrorCode.PROGRAM_NOT_FOUND, `Report ${reportId} not found`, programId);
}
