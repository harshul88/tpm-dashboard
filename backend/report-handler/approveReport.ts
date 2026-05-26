import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ok, err } from '../shared/response';
import { ErrorCode } from '../shared/errors';
import crypto from 'node:crypto';

interface ApproveReportBody {
  report_id: string;
  edits?: string | null;
}

export async function approveReport(
  event: APIGatewayProxyEvent,
  programId: string,
): Promise<APIGatewayProxyResult> {
  if (!event.body) {
    return err(ErrorCode.INVALID_PARAMS, 'Request body is required', programId);
  }

  let body: ApproveReportBody;
  try {
    body = JSON.parse(event.body) as ApproveReportBody;
  } catch {
    return err(ErrorCode.INVALID_PARAMS, 'Invalid JSON body', programId);
  }

  if (!body.report_id) {
    return err(ErrorCode.INVALID_PARAMS, 'report_id is required', programId);
  }

  // TODO: fetch draft from temp store by body.report_id
  // TODO: verify draft has not expired
  // TODO: apply body.edits to executiveSummary if provided
  // TODO: persist to DynamoDB report history with status: 'approved'

  const now = new Date().toISOString();
  const approvedReport = {
    report_id: crypto.randomUUID(),
    status: 'approved',
    approvedAt: now,
    generatedAt: now,
    weekEnding: now,
    ragStatus: 'green',
    executiveSummary: body.edits
      ? `[TPM edits applied] ${body.edits}`
      : 'Program is on track. Sprint at 60% completion with no critical blockers.',
    keyAccomplishments: [],
    blockersNeedingEscalation: [],
    riskSummary: [],
    upcomingMilestones: [],
    exportFormats: {
      markdown: '# Weekly Status Report\n\n**Status:** Green\n',
      pdfUrl: null,
    },
  };

  return ok({ report: approvedReport }, { programId, source: 'mock' });
}
