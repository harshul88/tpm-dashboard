import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { fail } from '../shared/response';
import { TpmError } from '../shared/errors';
import { getInitiatives } from './getInitiatives';
import { getOkrs } from './getOkrs';
import { getRisks } from './getRisks';
import { updateInitiative } from './updateInitiative';
import { updateRisk } from './updateRisk';

export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  const { httpMethod } = event;
  const programId     = event.pathParameters?.programId     ?? null;
  const initiativeId  = event.pathParameters?.initiativeId  ?? null;
  const riskId        = event.pathParameters?.riskId        ?? null;
  const resource      = event.resource ?? event.path;

  try {
    if (!programId) return fail(TpmError.invalidParams('programId is required'));

    if (httpMethod === 'GET'   && resource.endsWith('/initiatives')) return await getInitiatives(event, programId);
    if (httpMethod === 'GET'   && resource.endsWith('/okrs'))        return await getOkrs(event, programId);
    if (httpMethod === 'GET'   && resource.endsWith('/risks'))       return await getRisks(event, programId);
    if (httpMethod === 'PATCH' && initiativeId)                      return await updateInitiative(event, programId, initiativeId);
    if (httpMethod === 'PATCH' && riskId)                            return await updateRisk(event, programId, riskId);

    return fail(TpmError.invalidParams(`No route: ${httpMethod} ${event.path}`));
  } catch (e) {
    if (e instanceof TpmError) return fail(e);
    if (e instanceof Error)    return fail(TpmError.internal(e.message));
    return fail(TpmError.internal('Unknown error'));
  }
};
