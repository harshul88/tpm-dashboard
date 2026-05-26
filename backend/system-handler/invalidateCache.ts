import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  ScanCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb';
import { success, fail } from '../shared/response';
import { TpmError } from '../shared/errors';

const TABLE  = process.env.CACHE_TABLE_NAME ?? 'tpm-dashboard-cache';
const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));

type Scope = 'all' | 'sprint' | 'metrics' | 'roadmap';
const VALID_SCOPES: Scope[] = ['all', 'sprint', 'metrics', 'roadmap'];

async function deleteMatching(
  filterExpression: string | undefined,
  expressionAttributeValues?: Record<string, string>,
): Promise<number> {
  const scan = await dynamo.send(
    new ScanCommand({
      TableName: TABLE,
      ...(filterExpression && {
        FilterExpression: filterExpression,
        ExpressionAttributeValues: expressionAttributeValues,
      }),
      ProjectionExpression: 'pk',
    }),
  );

  const items = scan.Items ?? [];
  await Promise.all(
    items.map((item) =>
      dynamo.send(
        new DeleteCommand({
          TableName: TABLE,
          Key: { pk: item.pk as string },
        }),
      ),
    ),
  );
  return items.length;
}

export async function invalidateCache(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  let body: { scope?: string } = {};
  if (event.body) {
    try {
      body = JSON.parse(event.body) as { scope?: string };
    } catch {
      return fail(TpmError.invalidParams('Invalid JSON body'));
    }
  }

  const scope = (body.scope ?? 'all') as Scope;
  if (!VALID_SCOPES.includes(scope)) {
    return fail(
      TpmError.invalidParams(
        `Invalid scope "${scope}". Must be one of: ${VALID_SCOPES.join(', ')}`,
      ),
    );
  }

  let cleared: number;

  if (scope === 'all') {
    // Full table wipe — no filter
    cleared = await deleteMatching(undefined);
  } else {
    // Keys are structured as `programId:sprint:...`, `programId:metrics:...` etc.
    // Use DynamoDB contains() to match on the scope segment regardless of programId prefix.
    cleared = await deleteMatching('contains(pk, :scope)', {
      ':scope': `:${scope}:`,
    });
  }

  return success({ cleared, scope }, 'system');
}
