import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { success, fail, notImplemented } from '../shared/response';
import { TpmError } from '../shared/errors';
import { buildKey, get, set } from '../shared/cache';
import { getDataSource, getCacheTtl } from '../shared/config';

const MOCK_PATH = process.env.MOCK_DATA_PATH ?? join(process.cwd(), 'src/data');

type Severity = 'HIGH' | 'MEDIUM' | 'LOW';

const VALID_SEVERITIES: Severity[] = ['HIGH', 'MEDIUM', 'LOW'];
const SEVERITY_ORDER: Record<Severity, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

interface RawRisk {
  id: string;
  title: string;
  severity: string;
  initiative_id: string;
  description: string;
  mitigation?: string | null;
  status?: string;
}

interface EnrichedRisk {
  id: string;
  title: string;
  severity: Severity;
  initiative_id: string;
  description: string;
  mitigation: string | null;
  status: string;
}

function enrich(raw: RawRisk): EnrichedRisk {
  return {
    id:            raw.id,
    title:         raw.title,
    severity:      raw.severity as Severity,
    initiative_id: raw.initiative_id,
    description:   raw.description,
    mitigation:    raw.mitigation ?? null,
    status:        raw.status ?? 'open',
  };
}

export async function getRisks(
  event: APIGatewayProxyEvent,
  programId: string,
): Promise<APIGatewayProxyResult> {
  const src = getDataSource('roadmap');
  const key = buildKey(programId, 'roadmap', 'risks');

  type CachedList = EnrichedRisk[];
  const cached = await get<CachedList>(key);
  const all: EnrichedRisk[] = cached
    ? cached.data
    : (() => {
        const raw = JSON.parse(
          readFileSync(join(MOCK_PATH, 'risks.json'), 'utf-8'),
        ) as RawRisk[];
        return raw.map(enrich).sort((a, b) => {
          const diff = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
          return diff !== 0 ? diff : a.id.localeCompare(b.id);
        });
      })();

  if (!cached) {
    if (src !== 'mock') return notImplemented(`roadmap/risks from source: ${src}`);
    await set(key, all, getCacheTtl());
  }

  const severityParam     = event.queryStringParameters?.severity?.toUpperCase() ?? null;
  const initiativeIdParam = event.queryStringParameters?.initiative_id            ?? null;

  if (severityParam && !VALID_SEVERITIES.includes(severityParam as Severity)) {
    return fail(TpmError.invalidParams(`severity must be one of: ${VALID_SEVERITIES.join(', ')}`));
  }

  let risks = all;
  if (severityParam)     risks = risks.filter((r) => r.severity === severityParam);
  if (initiativeIdParam) risks = risks.filter((r) => r.initiative_id === initiativeIdParam);

  const count = (sev: Severity) => all.filter((r) => r.severity === sev).length;
  const requires_escalation = all.filter(
    (r) => r.severity === 'HIGH' && !r.mitigation,
  ).length;

  const data = {
    risks,
    summary: {
      total: all.length,
      by_severity: {
        HIGH:   count('HIGH'),
        MEDIUM: count('MEDIUM'),
        LOW:    count('LOW'),
      },
      requires_escalation,
    },
  };

  return success(data, src, !!cached, cached?.cachedAt ?? null);
}
