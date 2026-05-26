import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import crypto from 'node:crypto';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { success, fail } from '../shared/response';
import { TpmError } from '../shared/errors';

const TABLE  = process.env.PROGRAMS_TABLE_NAME ?? 'tpm-dashboard-programs';
const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));

interface ApproveReportBody {
  report_id: string;
  edits?:    Record<string, unknown> | null;
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

  if (!body.report_id) return fail(TpmError.invalidParams('report_id is required'));

  // Fetch draft
  let draft: Record<string, unknown> | undefined;
  try {
    const result = await dynamo.send(new GetCommand({ TableName: TABLE, Key: { id: body.report_id } }));
    draft = result.Item as Record<string, unknown> | undefined;
  } catch (e) {
    console.error('[report-handler] DynamoDB GetCommand failed:', e);
    return fail(TpmError.internal('Failed to fetch draft'));
  }

  if (!draft) return fail(TpmError.invalidParams(`Draft ${body.report_id} not found`));
  if (draft['type'] !== 'report_draft') return fail(TpmError.invalidParams(`${body.report_id} is not a report draft`));
  if (draft['program_id'] !== programId) return fail(TpmError.invalidParams(`Draft does not belong to program ${programId}`));

  // Verify draft not expired
  const expiresAt = new Date(draft['expires_at'] as string);
  if (expiresAt.getTime() < Date.now()) {
    return fail(TpmError.invalidParams('Draft has expired — regenerate the report'));
  }

  // Build approved record (no TTL field — permanent)
  const now        = new Date();
  const approvedId = crypto.randomUUID();

  const approved: Record<string, unknown> = {
    id:          approvedId,
    type:        'report_approved',
    program_id:  programId,
    report:      draft['report'],
    audience:    draft['audience'],
    tone:        draft['tone'],
    week_ending: draft['week_ending'],
    confidence:  draft['confidence'],
    created_at:  draft['created_at'],
    approved_at: now.toISOString(),
  };
  if (body.edits) approved['edits'] = body.edits;

  try {
    await dynamo.send(new PutCommand({ TableName: TABLE, Item: approved }));
  } catch (e) {
    console.error('[report-handler] DynamoDB PutCommand failed:', e);
    return fail(TpmError.internal('Failed to save approved report'));
  }

  // Delete draft — non-fatal; DynamoDB TTL will clean it up if this fails
  try {
    await dynamo.send(new DeleteCommand({ TableName: TABLE, Key: { id: body.report_id } }));
  } catch (e) {
    console.error('[report-handler] DynamoDB DeleteCommand failed (draft will expire via TTL):', e);
  }

  return success(
    {
      report_id:   approvedId,
      status:      'approved',
      approved_at: now.toISOString(),
      program_id:  programId,
    },
    'mock',
  );
}
