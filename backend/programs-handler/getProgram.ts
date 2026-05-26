import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { success } from '../shared/response';
import { buildKey, get, set } from '../shared/cache';
import { getCacheTtl } from '../shared/config';

export async function getProgram(
  _event: APIGatewayProxyEvent,
  programId: string,
): Promise<APIGatewayProxyResult> {
  const key = buildKey('programs', programId);
  const cached = await get(key);
  if (cached) return success(cached.data, 'mock', true, cached.cachedAt);

  // TODO: fetch from DynamoDB — throw TpmError.programNotFound(programId) if missing
  const data = {
    id: programId,
    name: 'Untitled Program',
    type: 'product-development',
    status: 'green',
    statusReason: 'All systems nominal',
    dataSource: 'mock',
    lastUpdated: new Date().toISOString(),
    dashboards: ['sprint', 'metrics', 'roadmap', 'report'],
    sharing: { enabled: false, collaborators: [] },
  };

  await set(key, data, getCacheTtl());
  return success(data, 'mock');
}
