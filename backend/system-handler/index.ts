import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { fail } from '../shared/response';
import { TpmError } from '../shared/errors';
import { getHealth } from './getHealth';
import { getConfig } from './getConfig';
import { invalidateCache } from './invalidateCache';

export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  const { httpMethod } = event;
  const programId = event.pathParameters?.programId ?? null;
  const resource  = event.resource ?? event.path;

  try {
    if (httpMethod === 'GET'  && resource.endsWith('/health'))     return await getHealth();
    if (httpMethod === 'GET'  && resource.endsWith('/config')     && programId) return await getConfig(event, programId);
    if (httpMethod === 'POST' && resource.endsWith('/invalidate') && programId) return await invalidateCache(event, programId);

    return fail(TpmError.invalidParams(`No route: ${httpMethod} ${event.path}`));
  } catch (e) {
    if (e instanceof TpmError) return fail(e);
    if (e instanceof Error)    return fail(TpmError.internal(e.message));
    return fail(TpmError.internal('Unknown error'));
  }
};
