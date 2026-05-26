import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { fail, notImplemented } from '../shared/response';
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
  const resource  = event.resource ?? event.path;

  try {
    // ── Collection routes (no programId) ─────────────────────────────────────
    if (httpMethod === 'GET'  && !programId) return await listPrograms(event);
    if (httpMethod === 'POST' && !programId) return await createProgram(event);

    // ── Single-program routes ─────────────────────────────────────────────────
    if (!programId) {
      return fail(TpmError.invalidParams(`No route: ${httpMethod} ${event.path}`));
    }

    if (httpMethod === 'GET'   && !resource.endsWith('/collaborators')) return await getProgram(event, programId);
    if (httpMethod === 'PATCH' && !resource.endsWith('/share'))         return await updateProgram(event, programId);

    // Sharing and collaborator management are planned for v2
    if (httpMethod === 'POST' && resource.endsWith('/share'))          return notImplemented('program sharing');
    if (httpMethod === 'GET'  && resource.endsWith('/collaborators'))  return notImplemented('program collaborators');

    return fail(TpmError.invalidParams(`No route: ${httpMethod} ${event.path}`));
  } catch (e) {
    if (e instanceof TpmError) return fail(e);
    if (e instanceof Error)    return fail(TpmError.internal(e.message));
    return fail(TpmError.internal('Unknown error'));
  }
};
