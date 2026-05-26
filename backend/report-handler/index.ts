import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { err } from '../shared/response';
import { ApiError, ErrorCode } from '../shared/errors';
import { generateReport } from './generateReport';
import { approveReport } from './approveReport';
import { getReportHistory } from './getReportHistory';
import { getReport } from './getReport';

export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  const { httpMethod } = event;
  const programId = event.pathParameters?.programId ?? null;
  const reportId = event.pathParameters?.reportId ?? null;
  const resource = event.resource ?? event.path;

  try {
    if (!programId) {
      return err(ErrorCode.INVALID_PARAMS, 'programId is required');
    }

    if (httpMethod === 'POST' && resource.endsWith('/generate')) return await generateReport(event, programId);
    if (httpMethod === 'POST' && resource.endsWith('/approve')) return await approveReport(event, programId);
    if (httpMethod === 'GET' && resource.endsWith('/history')) return await getReportHistory(event, programId);
    if (httpMethod === 'GET' && reportId) return await getReport(event, programId, reportId);

    return err(ErrorCode.INVALID_PARAMS, `No route: ${httpMethod} ${event.path}`, programId);
  } catch (e) {
    if (e instanceof ApiError) return err(e.code, e.message, programId);
    if (e instanceof Error) return err(ErrorCode.INTERNAL_ERROR, e.message, programId);
    return err(ErrorCode.INTERNAL_ERROR, 'Unknown error', programId);
  }
};
