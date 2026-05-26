import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { success } from '../shared/response';
import { TpmError } from '../shared/errors';
import { buildKey, get, set } from '../shared/cache';
import { getCacheTtl } from '../shared/config';
import type { Program } from '../shared/models';

const TABLE  = process.env.PROGRAMS_TABLE_NAME ?? 'tpm-dashboard-programs';
const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export async function getProgram(
  _event: APIGatewayProxyEvent,
  programId: string,
): Promise<APIGatewayProxyResult> {
  const key    = buildKey('programs', programId);
  const cached = await get<Program>(key);
  if (cached) return success(cached.data, 'mock', true, cached.cachedAt);

  const result = await dynamo.send(
    new GetCommand({ TableName: TABLE, Key: { id: programId } }),
  );

  if (!result.Item) throw TpmError.programNotFound(programId);

  const program = result.Item as Program;
  await set(key, program, getCacheTtl());
  return success(program, 'mock');
}
