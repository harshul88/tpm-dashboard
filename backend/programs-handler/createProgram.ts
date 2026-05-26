import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import crypto from 'node:crypto';
import { success, fail } from '../shared/response';
import { TpmError } from '../shared/errors';
import { invalidate } from '../shared/cache';
import type { Program, ProgramType } from '../shared/models';
import { PROGRAM_TEMPLATES } from '../shared/models';

const TABLE       = process.env.PROGRAMS_TABLE_NAME ?? 'tpm-dashboard-programs';
const VALID_TYPES: ProgramType[] = ['product_dev', 'compliance', 'migration', 'initiative'];
const dynamo      = DynamoDBDocumentClient.from(new DynamoDBClient({}));

interface CreateProgramBody {
  name:         string;
  type:         ProgramType;
  description?: string;
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

  if (!body.name?.trim()) {
    return fail(TpmError.invalidParams('name is required'));
  }
  if (!body.type || !VALID_TYPES.includes(body.type)) {
    return fail(TpmError.invalidParams(`type must be one of: ${VALID_TYPES.join(', ')}`));
  }

  const now      = new Date().toISOString();
  const template = PROGRAM_TEMPLATES[body.type];
  const program: Program = {
    ...template,
    id:          crypto.randomUUID(),
    name:        body.name.trim(),
    description: body.description?.trim() ?? template.description,
    created_at:  now,
    updated_at:  now,
  };

  await dynamo.send(new PutCommand({ TableName: TABLE, Item: program }));
  // Bust the programs list cache so the next GET /programs reflects this new entry
  await invalidate('global:programs');

  return success(program, 'mock');
}
