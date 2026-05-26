import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ok, err } from '../shared/response';
import { ErrorCode } from '../shared/errors';
import crypto from 'node:crypto';

interface CreateProgramBody {
  name: string;
  type: 'product-development' | 'compliance-risk' | 'platform-migration' | 'initiative-okr';
  dataMode: 'mock' | 'live';
}

export async function createProgram(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  if (!event.body) {
    return err(ErrorCode.INVALID_PARAMS, 'Request body is required');
  }

  let body: CreateProgramBody;
  try {
    body = JSON.parse(event.body) as CreateProgramBody;
  } catch {
    return err(ErrorCode.INVALID_PARAMS, 'Invalid JSON body');
  }

  if (!body.name || !body.type || !body.dataMode) {
    return err(ErrorCode.INVALID_PARAMS, 'name, type, and dataMode are required');
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  // TODO: persist to DynamoDB programs table
  const program = {
    id,
    name: body.name,
    type: body.type,
    dataMode: body.dataMode,
    createdAt: now,
    configPath: 'tpm.config.json',
  };

  return ok(program, { programId: id, source: 'mock' }, 201);
}
