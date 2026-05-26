import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { err } from '../shared/response';
import { ApiError, ErrorCode } from '../shared/errors';
import { getCurrentSprint } from './getCurrentSprint';
import { getVelocity } from './getVelocity';
import { moveTicket } from './moveTicket';

export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  const { httpMethod } = event;
  const programId = event.pathParameters?.programId ?? null;
  const ticketId = event.pathParameters?.ticketId ?? null;
  const resource = event.resource ?? event.path;

  try {
    if (!programId) {
      return err(ErrorCode.INVALID_PARAMS, 'programId is required');
    }

    if (httpMethod === 'GET' && resource.endsWith('/current')) {
      return await getCurrentSprint(event, programId);
    }
    if (httpMethod === 'GET' && resource.endsWith('/velocity')) {
      return await getVelocity(event, programId);
    }
    if (httpMethod === 'PATCH' && ticketId) {
      return await moveTicket(event, programId, ticketId);
    }

    return err(ErrorCode.INVALID_PARAMS, `No route: ${httpMethod} ${event.path}`, programId);
  } catch (e) {
    if (e instanceof ApiError) return err(e.code, e.message, programId);
    if (e instanceof Error) return err(ErrorCode.INTERNAL_ERROR, e.message, programId);
    return err(ErrorCode.INTERNAL_ERROR, 'Unknown error', programId);
  }
};
