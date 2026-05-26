import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { err } from '../shared/response';
import { ApiError, ErrorCode } from '../shared/errors';
import { getInitiatives } from './getInitiatives';
import { getOkrs } from './getOkrs';
import { getRisks } from './getRisks';
import { updateInitiative } from './updateInitiative';
import { updateRisk } from './updateRisk';

export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  const { httpMethod } = event;
  const programId = event.pathParameters?.programId ?? null;
  const initiativeId = event.pathParameters?.initiativeId ?? null;
  const riskId = event.pathParameters?.riskId ?? null;
  const resource = event.resource ?? event.path;

  try {
    if (!programId) {
      return err(ErrorCode.INVALID_PARAMS, 'programId is required');
    }

    if (httpMethod === 'GET' && resource.endsWith('/initiatives')) return await getInitiatives(event, programId);
    if (httpMethod === 'GET' && resource.endsWith('/okrs')) return await getOkrs(event, programId);
    if (httpMethod === 'GET' && resource.endsWith('/risks')) return await getRisks(event, programId);
    if (httpMethod === 'PATCH' && initiativeId) return await updateInitiative(event, programId, initiativeId);
    if (httpMethod === 'PATCH' && riskId) return await updateRisk(event, programId, riskId);

    return err(ErrorCode.INVALID_PARAMS, `No route: ${httpMethod} ${event.path}`, programId);
  } catch (e) {
    if (e instanceof ApiError) return err(e.code, e.message, programId);
    if (e instanceof Error) return err(ErrorCode.INTERNAL_ERROR, e.message, programId);
    return err(ErrorCode.INTERNAL_ERROR, 'Unknown error', programId);
  }
};
