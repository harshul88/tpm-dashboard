import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { fail } from '../shared/response';
import { TpmError } from '../shared/errors';
import { buildKey, get } from '../shared/cache';

export async function getReport(
  _event: APIGatewayProxyEvent,
  programId: string,
  reportId: string,
): Promise<APIGatewayProxyResult> {
  const key    = buildKey(programId, 'report', reportId);
  const cached = await get(key);
  if (cached) {
    // success imported lazily to avoid circular reference at module level
    const { success } = await import('../shared/response');
    return success(cached.data, 'mock', true, cached.cachedAt);
  }

  // TODO: fetch approved report from DynamoDB by reportId
  return fail(TpmError.programNotFound(reportId));
}
