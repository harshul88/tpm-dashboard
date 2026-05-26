import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { success, fail } from '../shared/response';
import { TpmError } from '../shared/errors';

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
  if (!event.body) return fail(TpmError.invalidParams('Request body is required'));

  let body: UpdateRiskBody;
  try {
    body = JSON.parse(event.body) as UpdateRiskBody;
  } catch {
    return fail(TpmError.invalidParams('Invalid JSON body'));
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

  return success(updated, 'mock');
}
