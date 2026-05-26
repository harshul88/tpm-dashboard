import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { success, dataPoint } from '../shared/response';
import { buildKey, get, set } from '../shared/cache';
import { getDataSource, getCacheTtl } from '../shared/config';

export async function getOkrs(
  _event: APIGatewayProxyEvent,
  programId: string,
): Promise<APIGatewayProxyResult> {
  const src = getDataSource('roadmap');
  const key = buildKey(programId, 'roadmap', 'okrs');
  const cached = await get(key);
  if (cached) return success(cached.data, src, true, cached.cachedAt);

  // TODO: fetch OKR data from Notion or Google Sheets
  const data = {
    objective: 'Deliver v1 platform on time and under budget',
    quarter: 'Q2 2026',
    keyResults: [
      {
        id: 'kr-1',
        title: 'Ship 3 of 4 program templates',
        progress: dataPoint(2, src, 'tpm'),
        target:   dataPoint(4, src, 'tpm'),
        unit: 'templates',
        status: 'on-track',
      },
      {
        id: 'kr-2',
        title: 'Time to first dashboard under 5 minutes',
        progress: dataPoint(7, src, 'tpm'),
        target:   dataPoint(5, src, 'tpm'),
        unit: 'minutes',
        status: 'at-risk',
      },
    ],
    overallProgress: dataPoint(55, src),
  };

  await set(key, data, getCacheTtl());
  return success(data, src);
}
