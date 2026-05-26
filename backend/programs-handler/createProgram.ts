import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { success, fail } from '../shared/response';
import { TpmError } from '../shared/errors';
import crypto from 'node:crypto';

interface CreateProgramBody {
  name: string;
  type: 'product-development' | 'compliance-risk' | 'platform-migration' | 'initiative-okr';
  dataMode: 'mock' | 'live';
}

export async function createProgram(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  if (!event.body) return fail(TpmError.invalidParams('Request body is required'));

  let body: CreateProgramBody;
  try {
    body = JSON.parse(event.body) as CreateProgramBody;
  } catch {
    return fail(TpmError.invalidParams('Invalid JSON body'));
  }

  if (!body.name || !body.type || !body.dataMode) {
    return fail(TpmError.invalidParams('name, type, and dataMode are required'));
  }

  // TODO: persist to DynamoDB programs table
  const program = {
    id: crypto.randomUUID(),
    name: body.name,
    type: body.type,
    dataMode: body.dataMode,
    createdAt: new Date().toISOString(),
    configPath: 'tpm.config.json',
  };

  return success(program, 'mock');
}
