import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { success, notImplemented } from '../shared/response';
import { buildKey, get, set } from '../shared/cache';
import { getDataSource, getCacheTtl } from '../shared/config';

const MOCK_PATH = process.env.MOCK_DATA_PATH ?? join(process.cwd(), 'src/data');

// Units where a lower value is closer to the goal
const LOWER_IS_BETTER = new Set(['ms', 'hrs', 'min', 'findings']);

type Rag = 'green' | 'amber' | 'red';

interface RawKr {
  title: string;
  current_value: number;
  target_value: number;
  unit: string;
}

interface RawOkr {
  objective: string;
  key_results: RawKr[];
}

interface EnrichedKr {
  title: string;
  current_value: number;
  target_value: number;
  unit: string;
  pct_complete: number;
  rag: Rag;
}

interface EnrichedOkr {
  id: string;
  objective: string;
  status: Rag;
  pct_complete: number;
  key_results: EnrichedKr[];
}

function krPctComplete(current: number, target: number, unit: string): number {
  if (LOWER_IS_BETTER.has(unit)) {
    if (target === 0) return current === 0 ? 100 : 0;
    // progress = how close current is to target (lower is better)
    return Math.min(100, Math.max(0, Math.round((target / current) * 100)));
  }
  if (target === 0) return 100;
  return Math.min(100, Math.max(0, Math.round((current / target) * 100)));
}

function krRag(pct: number): Rag {
  if (pct >= 70) return 'green';
  if (pct >= 40) return 'amber';
  return 'red';
}

function objectiveRag(krs: EnrichedKr[]): Rag {
  if (krs.some((kr) => kr.rag === 'red'))   return 'red';
  if (krs.some((kr) => kr.rag === 'amber')) return 'amber';
  return 'green';
}

function enrichOkr(raw: RawOkr, idx: number): EnrichedOkr {
  const key_results = raw.key_results.map((kr, ki) => {
    const pct_complete = krPctComplete(kr.current_value, kr.target_value, kr.unit);
    return {
      title:         kr.title,
      current_value: kr.current_value,
      target_value:  kr.target_value,
      unit:          kr.unit,
      pct_complete,
      rag:           krRag(pct_complete),
    };
  });

  const pct_complete =
    key_results.length > 0
      ? Math.round(
          key_results.reduce((s, kr) => s + kr.pct_complete, 0) / key_results.length,
        )
      : 0;

  return {
    id:          `okr-${idx + 1}`,
    objective:   raw.objective,
    status:      objectiveRag(key_results),
    pct_complete,
    key_results,
  };
}

export async function getOkrs(
  event: APIGatewayProxyEvent,
  programId: string,
): Promise<APIGatewayProxyResult> {
  const src = getDataSource('roadmap');
  const key = buildKey(programId, 'roadmap', 'okrs');

  type CachedList = EnrichedOkr[];
  const cached = await get<CachedList>(key);
  const all: EnrichedOkr[] = cached
    ? cached.data
    : (() => {
        const raw = JSON.parse(
          readFileSync(join(MOCK_PATH, 'okrs.json'), 'utf-8'),
        ) as RawOkr[];
        return raw.map(enrichOkr);
      })();

  if (!cached) {
    if (src !== 'mock') return notImplemented(`roadmap/okrs from source: ${src}`);
    await set(key, all, getCacheTtl());
  }

  const includeKrs = event.queryStringParameters?.include_krs !== 'false';

  const okrs = includeKrs
    ? all
    : all.map(({ key_results: _kr, ...rest }) => rest);

  const ragCount = (rag: Rag) => all.filter((o) => o.status === rag).length;
  const avg_completion =
    all.length > 0
      ? Math.round(all.reduce((s, o) => s + o.pct_complete, 0) / all.length)
      : 0;

  const data = {
    okrs,
    summary: {
      total_objectives: all.length,
      on_track:         ragCount('green'),
      at_risk:          ragCount('amber'),
      off_track:        ragCount('red'),
      avg_completion,
    },
  };

  return success(data, src, !!cached, cached?.cachedAt ?? null);
}
