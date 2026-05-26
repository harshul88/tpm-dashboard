import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { success, fail } from '../shared/response';
import { TpmError } from '../shared/errors';
import { buildKey, invalidate } from '../shared/cache';
import type { Program, ProgramStatus } from '../shared/models';

const TABLE  = process.env.PROGRAMS_TABLE_NAME ?? 'tpm-dashboard-programs';
const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));

interface UpdateProgramBody {
  name?:            string;
  description?:     string;
  status_override?: ProgramStatus | null;
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

  const existing = await dynamo.send(
    new GetCommand({ TableName: TABLE, Key: { id: programId } }),
  );
  if (!existing.Item) throw TpmError.programNotFound(programId);

  const program = existing.Item as Program;
  const updated: Program = {
    ...program,
    ...(body.name            !== undefined && { name:            body.name.trim() }),
    ...(body.description     !== undefined && { description:     body.description.trim() }),
    ...(body.status_override !== undefined && { status_override: body.status_override }),
    updated_at: new Date().toISOString(),
  };

  await dynamo.send(new PutCommand({ TableName: TABLE, Item: updated }));
  // Invalidate both the single-program cache and the list cache
  await invalidate(buildKey('programs', programId));
  await invalidate('global:programs');

  return success(updated, 'mock');
}
