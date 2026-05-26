import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ok } from '../shared/response';
import { dataPoint } from '../shared/response';
import { cacheKey, cacheGet, cachePut } from '../shared/cache';
import { getConfig } from '../shared/config';

export async function getRisks(
  _event: APIGatewayProxyEvent,
  programId: string,
): Promise<APIGatewayProxyResult> {
  const key = cacheKey(programId, 'roadmap-risks');
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

  // TODO: fetch risk register from Notion or Google Sheets
  const now = new Date().toISOString();
  const data = {
    risks: [
      {
        id: 'risk-1',
        title: 'CloudFront activation delay',
        probability: 'low',
        impact: 'high',
        status: 'mitigating',
        owner: 'Harshul Kumar',
        mitigationPlan: 'AWS Support case filed — fallback to GitHub Pages if unresolved by sprint end',
        raisedDate: now,
        dueDate: null,
      },
    ],
    openCount: dataPoint(1, src),
    highPriorityCount: dataPoint(1, src),
  };

  await cachePut(key, data);
  return ok(data, { programId, source: src === 'mock' ? 'mock' : 'live' });
}
