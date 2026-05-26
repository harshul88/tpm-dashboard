export const ErrorCode = {
  INVALID_PARAMS: 'INVALID_PARAMS',
  UNAUTHORIZED: 'UNAUTHORIZED',
  PROGRAM_NOT_FOUND: 'PROGRAM_NOT_FOUND',
  NOT_IMPLEMENTED: 'NOT_IMPLEMENTED',
  RATE_LIMITED: 'RATE_LIMITED',
  SOURCE_UNAVAILABLE: 'SOURCE_UNAVAILABLE',
  STALE_DATA: 'STALE_DATA',
  AI_GENERATION_FAILED: 'AI_GENERATION_FAILED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export const HttpStatus: Record<ErrorCode, number> = {
  INVALID_PARAMS: 400,
  UNAUTHORIZED: 401,
  PROGRAM_NOT_FOUND: 404,
  NOT_IMPLEMENTED: 501,
  RATE_LIMITED: 429,
  SOURCE_UNAVAILABLE: 502,
  STALE_DATA: 200,
  AI_GENERATION_FAILED: 500,
  INTERNAL_ERROR: 500,
};

export const Retryable: Record<ErrorCode, boolean> = {
  INVALID_PARAMS: false,
  UNAUTHORIZED: false,
  PROGRAM_NOT_FOUND: false,
  NOT_IMPLEMENTED: false,
  RATE_LIMITED: true,
  SOURCE_UNAVAILABLE: true,
  STALE_DATA: false,
  AI_GENERATION_FAILED: true,
  INTERNAL_ERROR: true,
};

export class ApiError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
