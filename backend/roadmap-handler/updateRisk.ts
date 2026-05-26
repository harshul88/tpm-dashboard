import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ok, err } from '../shared/response';
import { ErrorCode } from '../shared/errors';

type RiskStatus = 'open' | 'mitigating' | 'closed';

interface UpdateRiskBody {
  status?: RiskStatus;
  mitigationPlan?: string;
  owner?: string;
}

export async function updateRisk(
  event: APIGatewayProxyEvent,
  programId: string,
  riskId: string,
): Promise<APIGatewayProxyResult> {
  if (!event.body) {
    return err(ErrorCode.INVALID_PARAMS, 'Request body is required', programId);
  }

  let body: UpdateRiskBody;
  try {
    body = JSON.parse(event.body) as UpdateRiskBody;
  } catch {
    return err(ErrorCode.INVALID_PARAMS, 'Invalid JSON body', programId);
  }

  // Mock mode only in v1
  const updated = {
    id: riskId,
    title: 'Risk title',
    probability: 'low',
    impact: 'high',
    status: body.status ?? 'open',
    owner: body.owner ?? '',
    mitigationPlan: body.mitigationPlan ?? '',
    raisedDate: new Date().toISOString(),
    dueDate: null,
  };

  return ok(updated, { programId, source: 'mock' });
}
