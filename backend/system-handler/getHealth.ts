import type { APIGatewayProxyResult } from 'aws-lambda';
import { success } from '../shared/response';

export async function getHealth(): Promise<APIGatewayProxyResult> {
  return success(
    { status: 'ok', version: 'v1', timestamp: new Date().toISOString() },
    'mock',
  );
}
