import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { success, fail } from '../shared/response';
import { TpmError } from '../shared/errors';

const TABLE  = process.env.PROGRAMS_TABLE_NAME ?? 'tpm-dashboard-programs';
const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));

interface ReportMeta {
  report_id:   string;
  program_id:  string;
  week_ending: string;
  audience:    string;
  tone:        string;
  confidence:  string;
  rag_status:  string;
  approved_at: string;
  created_at:  string;
}

export async function getReportHistory(
  event: APIGatewayProxyEvent,
  programId: string,
): Promise<APIGatewayProxyResult> {
  const limit = Math.min(Number(event.queryStringParameters?.limit ?? 10), 50);

  let items: Record<string, unknown>[];
  try {
    const result = await dynamo.send(
      new ScanCommand({
        TableName:                 TABLE,
        FilterExpression:          '#t = :type AND program_id = :pid',
        ExpressionAttributeNames:  { '#t': 'type' },
        ExpressionAttributeValues: { ':type': 'report_approved', ':pid': programId },
      }),
    );
    items = (result.Items ?? []) as Record<string, unknown>[];
  } catch (e) {
    console.error('[report-handler] DynamoDB ScanCommand failed:', e);
    return fail(TpmError.internal('Failed to fetch report history'));
  }

  // Sort descending by approved_at
  items.sort((a, b) => {
    const ta = new Date(a['approved_at'] as string).getTime();
    const tb = new Date(b['approved_at'] as string).getTime();
    return tb - ta;
  });

  const reports: ReportMeta[] = items.slice(0, limit).map((item) => {
    const report = item['report'] as { rag_status?: string } | undefined;
    return {
      report_id:   item['id']          as string,
      program_id:  item['program_id']  as string,
      week_ending: item['week_ending'] as string,
      audience:    item['audience']    as string,
      tone:        item['tone']        as string,
      confidence:  item['confidence']  as string,
      rag_status:  report?.rag_status ?? 'unknown',
      approved_at: item['approved_at'] as string,
      created_at:  item['created_at']  as string,
    };
  });

  return success({ reports, total: items.length }, 'mock');
}
