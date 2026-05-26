import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { err } from '../shared/response';
import { ApiError, ErrorCode } from '../shared/errors';
import { getDora } from './getDora';
import { getDeployments } from './getDeployments';
import { getIncidents } from './getIncidents';

export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  const { httpMethod } = event;
  const programId = event.pathParameters?.programId ?? null;
  const resource = event.resource ?? event.path;

  try {
    if (!programId) {
      return err(ErrorCode.INVALID_PARAMS, 'programId is required');
    }

    if (httpMethod === 'GET' && resource.endsWith('/dora')) {
      return await getDora(event, programId);
    }
    if (httpMethod === 'GET' && resource.endsWith('/deployments')) {
      return await getDeployments(event, programId);
    }
    if (httpMethod === 'GET' && resource.endsWith('/incidents')) {
      return await getIncidents(event, programId);
    }

    return err(ErrorCode.INVALID_PARAMS, `No route: ${httpMethod} ${event.path}`, programId);
  } catch (e) {
    if (e instanceof ApiError) return err(e.code, e.message, programId);
    if (e instanceof Error) return err(ErrorCode.INTERNAL_ERROR, e.message, programId);
    return err(ErrorCode.INTERNAL_ERROR, 'Unknown error', programId);
  }
};
