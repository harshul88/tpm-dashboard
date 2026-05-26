import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { success, dataPoint } from '../shared/response';
import { buildKey, get, set } from '../shared/cache';
import { getDataSource, getCacheTtl } from '../shared/config';

export async function getInitiatives(
  _event: APIGatewayProxyEvent,
  programId: string,
): Promise<APIGatewayProxyResult> {
  const src = getDataSource('roadmap');
  const key = buildKey(programId, 'roadmap', 'initiatives');
  const cached = await get(key);
  if (cached) return success(cached.data, src, true, cached.cachedAt);

  // TODO: fetch from Notion database or Google Sheet based on src
  const data = {
    initiatives: [
      {
        id: 'init-1',
        title: 'Platform Migration',
        status: 'in-progress',
        owner: 'Engineering',
        dueDate: new Date().toISOString(),
        completionPercent: dataPoint(45, src, 'tpm'),
        quarter: 'Q2 2026',
      },
    ],
  };

  await set(key, data, getCacheTtl());
  return success(data, src);
}
