import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { fail } from '../shared/response';
import { TpmError } from '../shared/errors';
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
    if (httpMethod === 'GET'   && !programId) return await listPrograms(event);
    if (httpMethod === 'POST'  && !programId) return await createProgram(event);
    if (httpMethod === 'GET'   && programId)  return await getProgram(event, programId);
    if (httpMethod === 'PATCH' && programId)  return await updateProgram(event, programId);

    return fail(TpmError.invalidParams(`No route: ${httpMethod} ${event.path}`));
  } catch (e) {
    if (e instanceof TpmError) return fail(e);
    if (e instanceof Error)   return fail(TpmError.internal(e.message));
    return fail(TpmError.internal('Unknown error'));
  }
};
