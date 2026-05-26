import type { APIGatewayProxyResult } from 'aws-lambda';
import { ErrorCode, HttpStatus, Retryable } from './errors';

export type Source = 'live' | 'mock' | 'cached';

export interface DataPoint {
  value: number;
  source_at_time: 'mock' | 'jira' | 'linear' | 'github' | 'notion' | 'google-sheets';
  recorded_at: string;
  updated_by: 'system' | 'tpm';
}

interface MetaInput {
  programId?: string | null;
  source?: Source | null;
  cachedAt?: string | null;
}

const JSON_HEADERS = { 'Content-Type': 'application/json' };

export function ok(
  data: unknown,
  meta: MetaInput = {},
  statusCode = 200,
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: JSON_HEADERS,
    body: JSON.stringify({
      data,
      meta: {
        programId: meta.programId ?? null,
        source: meta.source ?? null,
        cachedAt: meta.cachedAt ?? null,
        generatedAt: new Date().toISOString(),
        version: 'v1',
      },
      error: null,
    }),
  };
}

export function err(
  code: ErrorCode,
  message: string,
  programId: string | null = null,
): APIGatewayProxyResult {
  return {
    statusCode: HttpStatus[code],
    headers: JSON_HEADERS,
    body: JSON.stringify({
      data: null,
      meta: {
        programId,
        source: null,
        cachedAt: null,
        generatedAt: new Date().toISOString(),
        version: 'v1',
      },
      error: { code, message, retryable: Retryable[code] },
    }),
  };
}

export function dataPoint(
  value: number,
  source: DataPoint['source_at_time'],
  updatedBy: DataPoint['updated_by'] = 'system',
): DataPoint {
  return { value, source_at_time: source, recorded_at: new Date().toISOString(), updated_by: updatedBy };
}
