import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { success, fail } from '../shared/response';
import { TpmError } from '../shared/errors';
import crypto from 'node:crypto';

interface ApproveReportBody {
  report_id: string;
  edits?: string | null;
}

export async function approveReport(
  event: APIGatewayProxyEvent,
  programId: string,
): Promise<APIGatewayProxyResult> {
  if (!event.body) return fail(TpmError.invalidParams('Request body is required'));

  let body: ApproveReportBody;
  try {
    body = JSON.parse(event.body) as ApproveReportBody;
  } catch {
    return fail(TpmError.invalidParams('Invalid JSON body'));
  }

  if (!body.report_id) {
    return fail(TpmError.invalidParams('report_id is required'));
  }

  // TODO: fetch draft from temp store, verify not expired, apply edits, persist to history
  const now = new Date().toISOString();
  const approvedReport = {
    report_id:   crypto.randomUUID(),
    status:      'approved',
    approvedAt:  now,
    generatedAt: now,
    weekEnding:  now,
    ragStatus:   'green',
    executiveSummary: body.edits
      ? `[TPM edits applied] ${body.edits}`
      : 'Program is on track. Sprint at 60% completion with no critical blockers.',
    keyAccomplishments:        [],
    blockersNeedingEscalation: [],
    riskSummary:               [],
    upcomingMilestones:        [],
    exportFormats: {
      markdown: '# Weekly Status Report\n\n**Status:** Green\n',
      pdfUrl: null,
    },
  };

  return success({ report: approvedReport }, 'mock');
}
