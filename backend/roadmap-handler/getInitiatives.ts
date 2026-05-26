import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ok } from '../shared/response';
import { dataPoint } from '../shared/response';
import { cacheKey, cacheGet, cachePut } from '../shared/cache';
import { getConfig } from '../shared/config';

export async function getInitiatives(
  _event: APIGatewayProxyEvent,
  programId: string,
): Promise<APIGatewayProxyResult> {
  const key = cacheKey(programId, 'roadmap-initiatives');
  const cached = await cacheGet<unknown>(key);
  if (cached) {
    return ok(cached.data, { programId, source: 'cached', cachedAt: cached.cachedAt });
  }

  const config = getConfig();
  const src = config.integrations.notion.enabled
    ? 'notion'
    : config.integrations.googleSheets.enabled
      ? 'google-sheets'
      : 'mock';

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

  await cachePut(key, data);
  return ok(data, { programId, source: src === 'mock' ? 'mock' : 'live' });
}
