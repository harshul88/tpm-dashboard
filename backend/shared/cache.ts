import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  DeleteCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';

const TABLE = process.env.CACHE_TABLE_NAME ?? 'tpm-dashboard-cache';
const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export interface CacheEntry<T = unknown> {
  data: T;
  cachedAt: string;
}

export function buildKey(...parts: string[]): string {
  return parts.join(':');
}

export async function get<T = unknown>(key: string): Promise<CacheEntry<T> | null> {
  if (process.env.BYPASS_CACHE === 'true') return null;

  const result = await dynamo.send(
    new GetCommand({ TableName: TABLE, Key: { pk: key } }),
  );
  if (!result.Item) return null;

  const now = Math.floor(Date.now() / 1000);
  if ((result.Item.ttl as number) < now) return null;

  return {
    data: result.Item.data as T,
    cachedAt: result.Item.cachedAt as string,
  };
}

export async function set(
  key: string,
  value: unknown,
  ttlMinutes: number,
): Promise<void> {
  const ttl = Math.floor(Date.now() / 1000) + ttlMinutes * 60;
  await dynamo.send(
    new PutCommand({
      TableName: TABLE,
      Item: { pk: key, data: value, cachedAt: new Date().toISOString(), ttl },
    }),
  );
}

export async function invalidate(pattern: string): Promise<number> {
  const scan = await dynamo.send(
    new ScanCommand({
      TableName: TABLE,
      FilterExpression: 'begins_with(pk, :prefix)',
      ExpressionAttributeValues: { ':prefix': pattern },
      ProjectionExpression: 'pk',
    }),
  );

  const items = scan.Items ?? [];
  await Promise.all(
    items.map((item) =>
      dynamo.send(
        new DeleteCommand({ TableName: TABLE, Key: { pk: item.pk as string } }),
      ),
    ),
  );
  return items.length;
}
