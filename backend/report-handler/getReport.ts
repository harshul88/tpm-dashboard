import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { success, fail } from '../shared/response';
import { TpmError } from '../shared/errors';

const TABLE  = process.env.PROGRAMS_TABLE_NAME ?? 'tpm-dashboard-programs';
const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export async function getReport(
  _event: APIGatewayProxyEvent,
  programId: string,
  reportId: string,
): Promise<APIGatewayProxyResult> {
  let item: Record<string, unknown> | undefined;
  try {
    const result = await dynamo.send(new GetCommand({ TableName: TABLE, Key: { id: reportId } }));
    item = result.Item as Record<string, unknown> | undefined;
  } catch (e) {
    console.error('[report-handler] DynamoDB GetCommand failed:', e);
    return fail(TpmError.internal('Failed to fetch report'));
  }

  if (!item) return fail(TpmError.invalidParams(`Report ${reportId} not found`));
  if (item['type'] !== 'report_approved') return fail(TpmError.invalidParams(`${reportId} is not an approved report`));
  if (item['program_id'] !== programId) return fail(TpmError.invalidParams(`Report does not belong to program ${programId}`));

  const report = item['report'] as { rag_status?: string } | undefined;

  return success(
    {
      report_id:   item['id'],
      program_id:  item['program_id'],
      week_ending: item['week_ending'],
      audience:    item['audience'],
      tone:        item['tone'],
      confidence:  item['confidence'],
      rag_status:  report?.rag_status ?? 'unknown',
      approved_at: item['approved_at'],
      created_at:  item['created_at'],
      report:      item['report'],
      edits:       item['edits'] ?? null,
    },
    'mock',
  );
}
