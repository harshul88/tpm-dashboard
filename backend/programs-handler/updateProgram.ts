import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { success, fail } from '../shared/response';
import { TpmError } from '../shared/errors';

interface UpdateProgramBody {
  name?: string;
  statusOverride?: 'green' | 'amber' | 'red' | null;
  dataMode?: 'mock' | 'live';
}

export async function updateProgram(
  event: APIGatewayProxyEvent,
  programId: string,
): Promise<APIGatewayProxyResult> {
  if (!event.body) return fail(TpmError.invalidParams('Request body is required'));

  let body: UpdateProgramBody;
  try {
    body = JSON.parse(event.body) as UpdateProgramBody;
  } catch {
    return fail(TpmError.invalidParams('Invalid JSON body'));
  }

  // TODO: fetch + patch + persist to DynamoDB
  const updated = {
    id: programId,
    name: body.name ?? 'Untitled Program',
    type: 'product-development',
    status: body.statusOverride ?? 'green',
    statusReason: body.statusOverride ? 'Status manually overridden' : 'All systems nominal',
    dataSource: body.dataMode ?? 'mock',
    lastUpdated: new Date().toISOString(),
    dashboards: ['sprint', 'metrics', 'roadmap', 'report'],
    sharing: { enabled: false, collaborators: [] },
  };

  return success(updated, 'mock');
}
