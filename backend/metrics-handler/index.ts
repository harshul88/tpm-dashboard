import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { fail } from '../shared/response';
import { TpmError } from '../shared/errors';
import { getDora } from './getDora';
import { getDeployments } from './getDeployments';
import { getIncidents } from './getIncidents';

export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  const { httpMethod } = event;
  const programId = event.pathParameters?.programId ?? null;
  const resource  = event.resource ?? event.path;

  try {
    if (!programId) return fail(TpmError.invalidParams('programId is required'));

    if (httpMethod === 'GET' && resource.endsWith('/dora'))        return await getDora(event, programId);
    if (httpMethod === 'GET' && resource.endsWith('/deployments')) return await getDeployments(event, programId);
    if (httpMethod === 'GET' && resource.endsWith('/incidents'))   return await getIncidents(event, programId);

    return fail(TpmError.invalidParams(`No route: ${httpMethod} ${event.path}`));
  } catch (e) {
    if (e instanceof TpmError) return fail(e);
    if (e instanceof Error) {
      console.error('[metrics-handler] Unhandled error:', e.message, e.stack);
      return fail(TpmError.internal(e.message));
    }
    console.error('[metrics-handler] Unknown throw:', e);
    return fail(TpmError.internal('Unknown error'));
  }
};
