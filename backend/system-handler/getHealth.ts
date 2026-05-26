import type { APIGatewayProxyResult } from 'aws-lambda';
import { ok } from '../shared/response';

export async function getHealth(): Promise<APIGatewayProxyResult> {
  return ok(
    { status: 'ok', version: 'v1', timestamp: new Date().toISOString() },
    { programId: null, source: null },
  );
}
