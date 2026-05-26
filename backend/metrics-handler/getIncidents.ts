import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { success, fail, notImplemented } from '../shared/response';
import { TpmError } from '../shared/errors';
import { buildKey, get, set } from '../shared/cache';
import { getDataSource, getCacheTtl } from '../shared/config';

const MOCK_PATH = process.env.MOCK_DATA_PATH ?? join(process.cwd(), 'src/data');

const VALID_SEVERITIES = ['P1', 'P2', 'P3'] as const;
const VALID_STATUSES   = ['open', 'resolved'] as const;

type Severity = typeof VALID_SEVERITIES[number];
type Status   = typeof VALID_STATUSES[number];

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

  const daysParam     = event.queryStringParameters?.days;
  const severityParam = event.queryStringParameters?.severity?.toUpperCase();
  const statusParam   = event.queryStringParameters?.status?.toLowerCase();

  const days = daysParam ? Math.max(1, parseInt(daysParam, 10)) : 90;

  if (severityParam && !VALID_SEVERITIES.includes(severityParam as Severity)) {
    return fail(TpmError.invalidParams(`severity must be one of: ${VALID_SEVERITIES.join(', ')}`));
  }
  if (statusParam && !VALID_STATUSES.includes(statusParam as Status)) {
    return fail(TpmError.invalidParams(`status must be one of: ${VALID_STATUSES.join(', ')}`));
  }

  const severity = severityParam as Severity | undefined;
  const status   = statusParam   as Status   | undefined;

  const key = buildKey(
    programId, 'metrics', 'incidents',
    String(days), severity ?? 'all', status ?? 'all',
  );

  const cached = await get(key);
  if (cached) return success(cached.data, src, true, cached.cachedAt);

  if (src !== 'mock') return notImplemented(`metrics/incidents from source: ${src}`);

  const allIncidents = JSON.parse(
    readFileSync(join(MOCK_PATH, 'incidents.json'), 'utf-8'),
  ) as IncidentRow[];

  const MS_PER_MIN = 60_000;
  const cutoffMs   = Date.now() - days * 86_400_000;
  const now        = new Date().toISOString();

  const filtered = allIncidents
    .filter((i) => new Date(i.opened_at).getTime() >= cutoffMs)
    .filter((i) => !severity || i.severity === severity)
    .filter((i) => !status   || i.status   === status)
    .sort((a, b) => b.opened_at.localeCompare(a.opened_at));  // newest first

  const incidents = filtered.map((i) => {
    const duration_minutes =
      i.resolved_at !== null
        ? Math.round(
            (new Date(i.resolved_at).getTime() - new Date(i.opened_at).getTime()) / MS_PER_MIN,
          )
        : null;
    return {
      id:               i.id,
      title:            i.title,
      severity:         i.severity,
      opened_at:        i.opened_at,
      resolved_at:      i.resolved_at,
      status:           i.status as Status,
      duration_minutes,
      source_at_time:   src,
      recorded_at:      now,
      updated_by:       'system' as const,
    };
  });

  // Summary across the full filtered set (before severity/status filters for counts)
  const inWindow = allIncidents.filter(
    (i) => new Date(i.opened_at).getTime() >= cutoffMs,
  );
  const resolved = inWindow.filter((i) => i.status === 'resolved' && i.resolved_at !== null);
  const mttrValues = resolved.map(
    (i) =>
      (new Date(i.resolved_at!).getTime() - new Date(i.opened_at).getTime()) / MS_PER_MIN,
  );
  const avg_mttr_minutes =
    mttrValues.length > 0
      ? Math.round((mttrValues.reduce((a, b) => a + b, 0) / mttrValues.length) * 10) / 10
      : 0;
  const longest_incident_minutes =
    mttrValues.length > 0 ? Math.round(Math.max(...mttrValues)) : 0;

  const data = {
    period_days: days,
    filters: { severity: severity ?? null, status: status ?? null },
    incidents,
    summary: {
      total:                    inWindow.length,
      open:                     inWindow.filter((i) => i.status !== 'resolved').length,
      p1_count:                 inWindow.filter((i) => i.severity === 'P1').length,
      avg_mttr_minutes,
      longest_incident_minutes,
    },
  };

  await set(key, data, getCacheTtl());
  return success(data, src);
}
