import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { err } from '../shared/response';
import { ApiError, ErrorCode } from '../shared/errors';
import { listPrograms } from './listPrograms';
import { createProgram } from './createProgram';
import { getProgram } from './getProgram';
import { updateProgram } from './updateProgram';

export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  const { httpMethod } = event;
  const programId = event.pathParameters?.programId ?? null;

  try {
    if (httpMethod === 'GET' && !programId) return await listPrograms(event);
    if (httpMethod === 'POST' && !programId) return await createProgram(event);
    if (httpMethod === 'GET' && programId) return await getProgram(event, programId);
    if (httpMethod === 'PATCH' && programId) return await updateProgram(event, programId);

    return err(ErrorCode.INVALID_PARAMS, `No route: ${httpMethod} ${event.path}`);
  } catch (e) {
    if (e instanceof ApiError) return err(e.code, e.message, programId);
    if (e instanceof Error) return err(ErrorCode.INTERNAL_ERROR, e.message, programId);
    return err(ErrorCode.INTERNAL_ERROR, 'Unknown error', programId);
  }
};
