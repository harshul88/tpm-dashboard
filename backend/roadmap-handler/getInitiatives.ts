import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { success, notImplemented } from '../shared/response';
import { buildKey, get, set } from '../shared/cache';
import { getDataSource, getCacheTtl } from '../shared/config';

const MOCK_PATH = process.env.MOCK_DATA_PATH ?? join(process.cwd(), 'src/data');

const STATUS_MAP: Record<string, string> = {
  'on track':  'on_track',
  'at risk':   'at_risk',
  'off track': 'off_track',
  'planned':   'planned',
  'completed': 'completed',
};

interface RawInitiative {
  id: string;
  name: string;
  team: string;
  start_date: string;
  end_date: string;
  status: string;
  pct_complete: number;
  okr: string;
}

interface EnrichedInitiative extends RawInitiative {
  days_remaining: number;
  is_overdue: boolean;
  timeline_position: number;
}

interface QuarterRange {
  start: Date;
  end: Date;
  label: string;
}

function parseQuarter(q: string): QuarterRange | null {
  const match = q.match(/^(\d{4})-Q([1-4])$/i);
  if (!match) return null;
  const year = parseInt(match[1], 10);
  const qNum = parseInt(match[2], 10);
  const startMonth = (qNum - 1) * 3;       // 0, 3, 6, 9
  const endMonth   = startMonth + 2;
  const start = new Date(year, startMonth, 1);
  const end   = new Date(year, endMonth + 1, 0); // last day of the quarter
  return { start, end, label: `${year}-Q${qNum}` };
}

function enrich(raw: RawInitiative): EnrichedInitiative {
  const MS_PER_DAY = 86_400_000;
  const today  = Date.now();
  const startMs = new Date(raw.start_date).getTime();
  const endMs   = new Date(raw.end_date).getTime();
  const days_remaining = Math.round((endMs - today) / MS_PER_DAY);
  const is_overdue = endMs < today && raw.status.toLowerCase() !== 'completed';
  const totalMs = endMs - startMs;
  const timeline_position =
    totalMs > 0
      ? Math.min(100, Math.max(0, Math.round(((today - startMs) / totalMs) * 100)))
      : 0;
  return { ...raw, days_remaining, is_overdue, timeline_position };
}

export async function getInitiatives(
  event: APIGatewayProxyEvent,
  programId: string,
): Promise<APIGatewayProxyResult> {
  const src = getDataSource('roadmap');
  const key = buildKey(programId, 'roadmap', 'initiatives');

  // Cache stores the full enriched list — filters applied in-memory each request
  type CachedList = EnrichedInitiative[];
  const cached = await get<CachedList>(key);
  const all: EnrichedInitiative[] = cached
    ? cached.data
    : (() => {
        const raw = JSON.parse(
          readFileSync(join(MOCK_PATH, 'initiatives.json'), 'utf-8'),
        ) as RawInitiative[];
        return raw.map(enrich);
      })();

  if (!cached) {
    if (src !== 'mock') return notImplemented(`roadmap/initiatives from source: ${src}`);
    await set(key, all, getCacheTtl());
  }

  const quarterParam = event.queryStringParameters?.quarter ?? null;
  const statusParam  = event.queryStringParameters?.status?.toLowerCase()  ?? null;
  const teamParam    = event.queryStringParameters?.team?.toLowerCase()     ?? null;

  let quarter: QuarterRange | null = null;
  if (quarterParam) {
    quarter = parseQuarter(quarterParam);
    // invalid quarter format → silently return empty (no crash)
  }

  let initiatives = all;

  if (quarter) {
    const qs = quarter.start.getTime();
    const qe = quarter.end.getTime();
    initiatives = initiatives.filter((i) => {
      const startMs = new Date(i.start_date).getTime();
      const endMs   = new Date(i.end_date).getTime();
      return startMs <= qe && endMs >= qs;
    });
  }

  if (statusParam) {
    initiatives = initiatives.filter(
      (i) => i.status.toLowerCase() === statusParam,
    );
  }

  if (teamParam) {
    initiatives = initiatives.filter(
      (i) => i.team.toLowerCase() === teamParam,
    );
  }

  // Summary across the full window (before query filters) so it's consistent
  const bySrc = (s: string) =>
    all.filter((i) => STATUS_MAP[i.status.toLowerCase()] === s).length;

  const overdue_count = all.filter((i) => i.is_overdue).length;
  const avg_completion =
    all.length > 0
      ? Math.round(all.reduce((s, i) => s + i.pct_complete, 0) / all.length)
      : 0;

  const data = {
    quarter: quarter?.label ?? null,
    initiatives,
    summary: {
      total:        all.length,
      by_status: {
        on_track:  bySrc('on_track'),
        at_risk:   bySrc('at_risk'),
        off_track: bySrc('off_track'),
        planned:   bySrc('planned'),
      },
      avg_completion,
      overdue_count,
    },
  };

  return success(data, src, !!cached, cached?.cachedAt ?? null);
}
