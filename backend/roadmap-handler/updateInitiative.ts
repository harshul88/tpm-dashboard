import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { success, fail, dataPoint } from '../shared/response';
import { TpmError } from '../shared/errors';

type InitiativeStatus = 'not-started' | 'in-progress' | 'complete' | 'at-risk';

interface UpdateInitiativeBody {
  status?: InitiativeStatus;
  completionPercent?: number;
  owner?: string;
}

export async function updateInitiative(
  event: APIGatewayProxyEvent,
  programId: string,
  initiativeId: string,
): Promise<APIGatewayProxyResult> {
  if (!event.body) return fail(TpmError.invalidParams('Request body is required'));

  let body: UpdateInitiativeBody;
  try {
    body = JSON.parse(event.body) as UpdateInitiativeBody;
  } catch {
    return fail(TpmError.invalidParams('Invalid JSON body'));
  }

  // Mock mode only in v1
  const updated = {
    id: initiativeId,
    title: 'Initiative title',
    status: body.status ?? 'in-progress',
    owner: body.owner ?? '',
    dueDate: new Date().toISOString(),
    completionPercent: dataPoint(body.completionPercent ?? 0, 'mock', 'tpm'),
    quarter: 'Q2 2026',
  };

  return success(updated, 'mock');
}
