import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { success, fail, notImplemented } from '../shared/response';
import { TpmError } from '../shared/errors';
import { buildKey, invalidate } from '../shared/cache';
import { getDataSource } from '../shared/config';

const MOCK_PATH = process.env.MOCK_DATA_PATH ?? join(process.cwd(), 'src/data');

const VALID_SEVERITIES = ['HIGH', 'MEDIUM', 'LOW'] as const;
const VALID_STATUSES   = ['open', 'mitigating', 'closed'] as const;

interface RawRisk {
  id: string;
  title: string;
  severity: string;
  initiative_id: string;
  description: string;
  mitigation?: string | null;
  status?: string;
}

interface UpdateRiskBody {
  severity?:   string;
  mitigation?: string;
  status?:     string;
}

export async function updateRisk(
  event: APIGatewayProxyEvent,
  programId: string,
  riskId: string,
): Promise<APIGatewayProxyResult> {
  const src = getDataSource('roadmap');

  if (src === 'notion') return notImplemented('notion risk update');
  if (src !== 'mock')   return notImplemented(`risk update from source: ${src}`);

  if (!event.body) return fail(TpmError.invalidParams('Request body is required'));

  let body: UpdateRiskBody;
  try {
    body = JSON.parse(event.body) as UpdateRiskBody;
  } catch {
    return fail(TpmError.invalidParams('Invalid JSON body'));
  }

  if (
    body.severity !== undefined &&
    !VALID_SEVERITIES.includes(body.severity.toUpperCase() as typeof VALID_SEVERITIES[number])
  ) {
    return fail(
      TpmError.invalidParams(`severity must be one of: ${VALID_SEVERITIES.join(', ')}`),
    );
  }

  if (
    body.status !== undefined &&
    !VALID_STATUSES.includes(body.status as typeof VALID_STATUSES[number])
  ) {
    return fail(
      TpmError.invalidParams(`status must be one of: ${VALID_STATUSES.join(', ')}`),
    );
  }

  const risks = JSON.parse(
    readFileSync(join(MOCK_PATH, 'risks.json'), 'utf-8'),
  ) as RawRisk[];

  const risk = risks.find((r) => r.id === riskId);
  if (!risk) {
    return fail(TpmError.invalidParams(`Risk ${riskId} not found`));
  }

  // Apply partial update in memory (mock has no persistence)
  if (body.severity   !== undefined) risk.severity   = body.severity.toUpperCase();
  if (body.mitigation !== undefined) risk.mitigation = body.mitigation;
  if (body.status     !== undefined) risk.status     = body.status;

  // Bust the risks cache so next GET reflects the update
  await invalidate(buildKey(programId, 'roadmap', 'risks'));

  return success({ risk }, src);
}
