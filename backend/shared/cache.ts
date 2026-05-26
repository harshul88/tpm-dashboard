import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  DeleteCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import crypto from 'node:crypto';

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE = process.env.CACHE_TABLE ?? 'tpm-dashboard-cache';
const TTL_SECONDS = (Number(process.env.CACHE_TTL_SECONDS) || 5) * 60;

export function cacheKey(
  programId: string,
  endpoint: string,
  params: Record<string, unknown> = {},
): string {
  const hash = crypto
    .createHash('md5')
    .update(JSON.stringify(params))
    .digest('hex')
    .slice(0, 8);
  return `${programId}:${endpoint}:${hash}`;
}

export async function cacheGet<T>(
  key: string,
): Promise<{ data: T; cachedAt: string } | null> {
  const result = await dynamo.send(
    new GetCommand({ TableName: TABLE, Key: { pk: key } }),
  );
  if (!result.Item) return null;
  if ((result.Item.ttl as number) < Math.floor(Date.now() / 1000)) return null;
  return { data: result.Item.data as T, cachedAt: result.Item.cachedAt as string };
}

export async function cachePut(key: string, data: unknown): Promise<void> {
  await dynamo.send(
    new PutCommand({
      TableName: TABLE,
      Item: {
        pk: key,
        data,
        cachedAt: new Date().toISOString(),
        ttl: Math.floor(Date.now() / 1000) + TTL_SECONDS,
      },
    }),
  );
}

export async function cacheInvalidateProgram(programId: string): Promise<number> {
  // Scan for all keys belonging to this program and delete them.
  // Acceptable at v1 scale; replace with a GSI query if the table grows large.
  const scan = await dynamo.send(
    new ScanCommand({
      TableName: TABLE,
      FilterExpression: 'begins_with(pk, :prefix)',
      ExpressionAttributeValues: { ':prefix': `${programId}:` },
      ProjectionExpression: 'pk',
    }),
  );

  const items = scan.Items ?? [];
  await Promise.all(
    items.map((item) =>
      dynamo.send(new DeleteCommand({ TableName: TABLE, Key: { pk: item.pk } })),
    ),
  );
  return items.length;
}
