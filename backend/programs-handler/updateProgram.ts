import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ok, err } from '../shared/response';
import { ErrorCode } from '../shared/errors';

interface UpdateProgramBody {
  name?: string;
  statusOverride?: 'green' | 'amber' | 'red' | null;
  dataMode?: 'mock' | 'live';
}

export async function updateProgram(
  event: APIGatewayProxyEvent,
  programId: string,
): Promise<APIGatewayProxyResult> {
  if (!event.body) {
    return err(ErrorCode.INVALID_PARAMS, 'Request body is required', programId);
  }

  let body: UpdateProgramBody;
  try {
    body = JSON.parse(event.body) as UpdateProgramBody;
  } catch {
    return err(ErrorCode.INVALID_PARAMS, 'Invalid JSON body', programId);
  }

  // TODO: fetch existing program, apply patch, persist to DynamoDB
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

  return ok(updated, { programId, source: 'mock' });
}
