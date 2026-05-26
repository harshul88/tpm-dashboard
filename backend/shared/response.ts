import type { APIGatewayProxyResult } from 'aws-lambda';
import { TpmError } from './errors';
import type { Source } from './errors';

export type { Source };

export interface DataPoint {
  value: number;
  source_at_time: Source;
  recorded_at: string;
  updated_by: 'system' | 'tpm';
}

interface ResponseMeta {
  source: Source | null;
  cached: boolean;
  cached_at: string | null;
  fallback: boolean;
  version: '1.0.0';
}

interface ResponseEnvelope {
  data: unknown;
  meta: ResponseMeta;
  error: { code: string; message: string; retryable: boolean } | null;
}

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
};

export function lambdaResponse(
  statusCode: number,
  body: ResponseEnvelope,
): APIGatewayProxyResult {
  return { statusCode, headers: CORS_HEADERS, body: JSON.stringify(body) };
}

function meta(
  source: Source | null,
  cached: boolean,
  cachedAt: string | null,
  fallback: boolean,
): ResponseMeta {
  return { source, cached, cached_at: cachedAt, fallback, version: '1.0.0' };
}

export function success(
  data: unknown,
  source: Source,
  cached = false,
  cachedAt: string | null = null,
): APIGatewayProxyResult {
  return lambdaResponse(200, {
    data,
    meta: meta(source, cached, cachedAt, false),
    error: null,
  });
}

export function fallback(
  data: unknown,
  _originalSource: Source,
  fallbackSource: Source,
): APIGatewayProxyResult {
  return lambdaResponse(200, {
    data,
    meta: meta(fallbackSource, false, null, true),
    error: null,
  });
}

export function notImplemented(feature: string): APIGatewayProxyResult {
  return fail(TpmError.notImplemented(feature));
}

export function fail(error: TpmError): APIGatewayProxyResult {
  return lambdaResponse(error.status, {
    data: null,
    meta: meta(null, false, null, false),
    error: { code: error.code, message: error.message, retryable: error.retryable },
  });
}

export function dataPoint(
  value: number,
  source: Source,
  updatedBy: DataPoint['updated_by'] = 'system',
): DataPoint {
  return {
    value,
    source_at_time: source,
    recorded_at: new Date().toISOString(),
    updated_by: updatedBy,
  };
}
