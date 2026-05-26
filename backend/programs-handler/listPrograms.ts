import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { success } from '../shared/response';
import { buildKey, get, set } from '../shared/cache';
import { getCacheTtl } from '../shared/config';
import type { Program } from '../shared/models';
import { MOCK_PROGRAMS } from '../shared/models';

const TABLE  = process.env.PROGRAMS_TABLE_NAME ?? 'tpm-dashboard-programs';
const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export async function listPrograms(
  _event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  const key    = buildKey('global', 'programs');
  const cached = await get<{ programs: Program[] }>(key);
  if (cached) return success(cached.data, 'mock', true, cached.cachedAt);

  const result = await dynamo.send(new ScanCommand({ TableName: TABLE }));
  const items  = (result.Items ?? []) as Program[];

  const programs = items.length > 0
    ? items.sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    : MOCK_PROGRAMS;

  const data = { programs };
  await set(key, data, getCacheTtl());
  return success(data, 'mock');
}
