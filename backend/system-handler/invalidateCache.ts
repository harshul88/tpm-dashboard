import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { success } from '../shared/response';
import { invalidate } from '../shared/cache';

export async function invalidateCache(
  _event: APIGatewayProxyEvent,
  programId: string,
): Promise<APIGatewayProxyResult> {
  const keysCleared = await invalidate(programId);

  return success(
    { programId, invalidatedAt: new Date().toISOString(), keysCleared },
    'mock',
  );
}
