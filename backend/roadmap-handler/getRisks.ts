import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { success, dataPoint } from '../shared/response';
import { buildKey, get, set } from '../shared/cache';
import { getDataSource, getCacheTtl } from '../shared/config';

export async function getRisks(
  _event: APIGatewayProxyEvent,
  programId: string,
): Promise<APIGatewayProxyResult> {
  const src = getDataSource('roadmap');
  const key = buildKey(programId, 'roadmap', 'risks');
  const cached = await get(key);
  if (cached) return success(cached.data, src, true, cached.cachedAt);

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
    openCount:        dataPoint(1, src),
    highPriorityCount: dataPoint(1, src),
  };

  await set(key, data, getCacheTtl());
  return success(data, src);
}
