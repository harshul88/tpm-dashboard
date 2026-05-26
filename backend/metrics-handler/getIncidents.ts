import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { success, notImplemented } from '../shared/response';
import { buildKey, get, set } from '../shared/cache';
import { getDataSource, getCacheTtl } from '../shared/config';

const MOCK_PATH = process.env.MOCK_DATA_PATH ?? join(process.cwd(), 'src/data');

interface IncidentRow {
  id: string;
  title: string;
  severity: string;
  opened_at: string;
  resolved_at: string | null;
  status: string;
}

export async function getIncidents(
  event: APIGatewayProxyEvent,
  programId: string,
): Promise<APIGatewayProxyResult> {
  const src = getDataSource('engMetrics');

  const daysParam = event.queryStringParameters?.days;
  const days = daysParam ? Math.max(1, parseInt(daysParam, 10)) : 30;
  const key = buildKey(programId, 'metrics', 'incidents', String(days));

  const cached = await get(key);
  if (cached) return success(cached.data, src, true, cached.cachedAt);

  if (src !== 'mock') return notImplemented(`metrics/incidents from source: ${src}`);

  const allIncidents = JSON.parse(
    readFileSync(join(MOCK_PATH, 'incidents.json'), 'utf-8'),
  ) as IncidentRow[];

  const cutoffMs = Date.now() - days * 24 * 60 * 60 * 1000;
  const incidents = allIncidents
    .filter((i) => new Date(i.opened_at).getTime() >= cutoffMs)
    .sort((a, b) => b.opened_at.localeCompare(a.opened_at)); // newest first

  const MS_PER_HOUR = 3_600_000;
  const resolved  = incidents.filter((i) => i.status === 'resolved' && i.resolved_at !== null);
  const open      = incidents.filter((i) => i.status !== 'resolved');

  const mttrValues = resolved.map(
    (i) => (new Date(i.resolved_at!).getTime() - new Date(i.opened_at).getTime()) / MS_PER_HOUR,
  );
  const avg_mttr_hours = mttrValues.length > 0
    ? Math.round((mttrValues.reduce((a, b) => a + b, 0) / mttrValues.length) * 10) / 10
    : 0;

  const bySeverity = (sev: string) => incidents.filter((i) => i.severity === sev).length;

  const data = {
    period_days: days,
    incidents: incidents.map((i) => ({
      id:           i.id,
      title:        i.title,
      severity:     i.severity,
      opened_at:    i.opened_at,
      resolved_at:  i.resolved_at,
      status:       i.status,
      duration_hours:
        i.resolved_at !== null
          ? Math.round(
              ((new Date(i.resolved_at).getTime() - new Date(i.opened_at).getTime()) /
                MS_PER_HOUR) *
                10,
            ) / 10
          : null,
    })),
    summary: {
      total:          incidents.length,
      open_count:     open.length,
      resolved_count: resolved.length,
      avg_mttr_hours,
      by_severity: {
        P1: bySeverity('P1'),
        P2: bySeverity('P2'),
        P3: bySeverity('P3'),
      },
    },
  };

  await set(key, data, getCacheTtl());
  return success(data, src);
}
