import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ok } from '../shared/response';
import { dataPoint } from '../shared/response';
import { cacheKey, cacheGet, cachePut } from '../shared/cache';
import { getConfig } from '../shared/config';

export async function getOkrs(
  _event: APIGatewayProxyEvent,
  programId: string,
): Promise<APIGatewayProxyResult> {
  const key = cacheKey(programId, 'roadmap-okrs');
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

  // TODO: fetch OKR data from Notion or Google Sheets
  const data = {
    objective: 'Deliver v1 platform on time and under budget',
    quarter: 'Q2 2026',
    keyResults: [
      {
        id: 'kr-1',
        title: 'Ship 3 of 4 program templates',
        progress: dataPoint(2, src, 'tpm'),
        target: dataPoint(4, src, 'tpm'),
        unit: 'templates',
        status: 'on-track',
      },
      {
        id: 'kr-2',
        title: 'Time to first dashboard under 5 minutes',
        progress: dataPoint(7, src, 'tpm'),
        target: dataPoint(5, src, 'tpm'),
        unit: 'minutes',
        status: 'at-risk',
      },
    ],
    overallProgress: dataPoint(55, src),
  };

  await cachePut(key, data);
  return ok(data, { programId, source: src === 'mock' ? 'mock' : 'live' });
}
