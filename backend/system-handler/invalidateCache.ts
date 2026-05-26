import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ok } from '../shared/response';
import { cacheInvalidateProgram } from '../shared/cache';

export async function invalidateCache(
  _event: APIGatewayProxyEvent,
  programId: string,
): Promise<APIGatewayProxyResult> {
  const keysCleared = await cacheInvalidateProgram(programId);

  return ok(
    { programId, invalidatedAt: new Date().toISOString(), keysCleared },
    { programId, source: null },
  );
}
