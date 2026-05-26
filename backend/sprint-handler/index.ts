import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { fail } from '../shared/response';
import { TpmError } from '../shared/errors';
import { getCurrentSprint } from './getCurrentSprint';
import { getVelocity } from './getVelocity';
import { moveTicket } from './moveTicket';

export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  const { httpMethod } = event;
  const programId = event.pathParameters?.programId ?? null;
  const ticketId  = event.pathParameters?.ticketId  ?? null;
  const resource  = event.resource ?? event.path;

  try {
    if (!programId) return fail(TpmError.invalidParams('programId is required'));

    if (httpMethod === 'GET'   && resource.endsWith('/current'))  return await getCurrentSprint(event, programId);
    if (httpMethod === 'GET'   && resource.endsWith('/velocity')) return await getVelocity(event, programId);
    if (httpMethod === 'PATCH' && ticketId)                       return await moveTicket(event, programId, ticketId);

    return fail(TpmError.invalidParams(`No route: ${httpMethod} ${event.path}`));
  } catch (e) {
    if (e instanceof TpmError) return fail(e);
    if (e instanceof Error)    return fail(TpmError.internal(e.message));
    return fail(TpmError.internal('Unknown error'));
  }
};
