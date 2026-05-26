import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { fail } from '../shared/response';
import { TpmError } from '../shared/errors';
import { generateReport } from './generateReport';
import { approveReport } from './approveReport';
import { getReportHistory } from './getReportHistory';
import { getReport } from './getReport';

export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  const { httpMethod } = event;
  const programId = event.pathParameters?.programId ?? null;
  const reportId  = event.pathParameters?.reportId  ?? null;
  const resource  = event.resource ?? event.path;

  try {
    if (!programId) return fail(TpmError.invalidParams('programId is required'));

    if (httpMethod === 'POST' && resource.endsWith('/generate')) return await generateReport(event, programId);
    if (httpMethod === 'POST' && resource.endsWith('/approve'))  return await approveReport(event, programId);
    if (httpMethod === 'GET'  && resource.endsWith('/history'))  return await getReportHistory(event, programId);
    if (httpMethod === 'GET'  && reportId)                       return await getReport(event, programId, reportId);

    return fail(TpmError.invalidParams(`No route: ${httpMethod} ${event.path}`));
  } catch (e) {
    if (e instanceof TpmError) return fail(e);
    if (e instanceof Error) {
      console.error('[report-handler] Unhandled error:', e.message, e.stack);
      return fail(TpmError.internal(e.message));
    }
    console.error('[report-handler] Unknown throw:', e);
    return fail(TpmError.internal('Unknown error'));
  }
};
