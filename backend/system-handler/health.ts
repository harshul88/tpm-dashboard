import type { APIGatewayProxyResult } from 'aws-lambda';
import { success } from '../shared/response';

export async function health(): Promise<APIGatewayProxyResult> {
  const environment = process.env.ENVIRONMENT ?? 'development';
  const version     = process.env.npm_package_version ?? '1.0.0';

  return success(
    {
      status:      'ok',
      version,
      environment,
      timestamp:   new Date().toISOString(),
      uptime:      process.uptime(),
    },
    'system',
  );
}
