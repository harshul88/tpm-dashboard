import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { success, fail, notImplemented } from '../shared/response';
import { TpmError } from '../shared/errors';
import { buildKey, invalidate } from '../shared/cache';
import { getDataSource } from '../shared/config';

const MOCK_PATH = process.env.MOCK_DATA_PATH ?? join(process.cwd(), 'src/data');

const VALID_STATUSES = ['On track', 'At risk', 'Off track', 'Planned', 'Completed'] as const;

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

interface UpdateInitiativeBody {
  status?: string;
  pct_complete?: number;
  end_date?: string;
}

export async function updateInitiative(
  event: APIGatewayProxyEvent,
  programId: string,
  initiativeId: string,
): Promise<APIGatewayProxyResult> {
  const src = getDataSource('roadmap');

  if (src === 'notion') return notImplemented('notion initiative update');
  if (src !== 'mock')   return notImplemented(`initiative update from source: ${src}`);

  if (!event.body) return fail(TpmError.invalidParams('Request body is required'));

  let body: UpdateInitiativeBody;
  try {
    body = JSON.parse(event.body) as UpdateInitiativeBody;
  } catch {
    return fail(TpmError.invalidParams('Invalid JSON body'));
  }

  if (body.status !== undefined && !VALID_STATUSES.includes(body.status as typeof VALID_STATUSES[number])) {
    return fail(
      TpmError.invalidParams(`status must be one of: ${VALID_STATUSES.join(', ')}`),
    );
  }

  if (
    body.pct_complete !== undefined &&
    (body.pct_complete < 0 || body.pct_complete > 100)
  ) {
    return fail(TpmError.invalidParams('pct_complete must be between 0 and 100'));
  }

  const initiatives = JSON.parse(
    readFileSync(join(MOCK_PATH, 'initiatives.json'), 'utf-8'),
  ) as RawInitiative[];

  const initiative = initiatives.find((i) => i.id === initiativeId);
  if (!initiative) {
    return fail(TpmError.invalidParams(`Initiative ${initiativeId} not found`));
  }

  // Apply partial update in memory (mock has no persistence)
  if (body.status       !== undefined) initiative.status       = body.status;
  if (body.pct_complete !== undefined) initiative.pct_complete = body.pct_complete;
  if (body.end_date     !== undefined) initiative.end_date     = body.end_date;

  // Bust the initiatives cache so next GET reflects the update
  await invalidate(buildKey(programId, 'roadmap', 'initiatives'));

  return success({ initiative }, src);
}
