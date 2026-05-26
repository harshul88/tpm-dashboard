import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { err } from '../shared/response';
import { ApiError, ErrorCode } from '../shared/errors';
import { getHealth } from './getHealth';
import { getConfig } from './getConfig';
import { invalidateCache } from './invalidateCache';

export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  const { httpMethod } = event;
  const programId = event.pathParameters?.programId ?? null;
  const resource = event.resource ?? event.path;

  try {
    if (httpMethod === 'GET' && resource.endsWith('/health')) return await getHealth();
    if (httpMethod === 'GET' && resource.endsWith('/config') && programId) return await getConfig(event, programId);
    if (httpMethod === 'POST' && resource.endsWith('/invalidate') && programId) return await invalidateCache(event, programId);

    return err(ErrorCode.INVALID_PARAMS, `No route: ${httpMethod} ${event.path}`, programId);
  } catch (e) {
    if (e instanceof ApiError) return err(e.code, e.message, programId);
    if (e instanceof Error) return err(ErrorCode.INTERNAL_ERROR, e.message, programId);
    return err(ErrorCode.INTERNAL_ERROR, 'Unknown error', programId);
  }
};
