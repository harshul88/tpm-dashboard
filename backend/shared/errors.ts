export type Source =
  | 'mock'
  | 'system'
  | 'github'
  | 'notion'
  | 'jira'
  | 'linear'
  | 'pagerduty'
  | 'google-sheets';

export const ErrorCodes = {
  INVALID_PARAMS:       { code: 'INVALID_PARAMS',       status: 400, retryable: false },
  UNAUTHORIZED:         { code: 'UNAUTHORIZED',          status: 401, retryable: false },
  PROGRAM_NOT_FOUND:    { code: 'PROGRAM_NOT_FOUND',     status: 404, retryable: false },
  RATE_LIMITED:         { code: 'RATE_LIMITED',          status: 429, retryable: true  },
  SOURCE_UNAVAILABLE:   { code: 'SOURCE_UNAVAILABLE',    status: 503, retryable: true  },
  STALE_DATA:           { code: 'STALE_DATA',            status: 200, retryable: false },
  AI_GENERATION_FAILED: { code: 'AI_GENERATION_FAILED',  status: 500, retryable: true  },
  NOT_IMPLEMENTED:      { code: 'NOT_IMPLEMENTED',       status: 501, retryable: false },
  INTERNAL_ERROR:       { code: 'INTERNAL_ERROR',        status: 500, retryable: true  },
} as const;

type ErrorCodeKey = keyof typeof ErrorCodes;

export class TpmError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly retryable: boolean;

  constructor(key: ErrorCodeKey, message: string) {
    super(message);
    this.name = 'TpmError';
    const def = ErrorCodes[key];
    this.code = def.code;
    this.status = def.status;
    this.retryable = def.retryable;
  }

  static invalidParams(message: string): TpmError {
    return new TpmError('INVALID_PARAMS', message);
  }

  static unauthorized(message = 'Unauthorized'): TpmError {
    return new TpmError('UNAUTHORIZED', message);
  }

  static programNotFound(id: string): TpmError {
    return new TpmError('PROGRAM_NOT_FOUND', `Program ${id} not found`);
  }

  static rateLimited(message = 'Rate limit exceeded — retry after backoff'): TpmError {
    return new TpmError('RATE_LIMITED', message);
  }

  static sourceUnavailable(source: string): TpmError {
    return new TpmError('SOURCE_UNAVAILABLE', `Source unavailable: ${source}. Falling back to mock.`);
  }

  static staleData(message = 'Cache TTL exceeded and source unavailable — serving last known data'): TpmError {
    return new TpmError('STALE_DATA', message);
  }

  static aiGenerationFailed(message = 'Claude failed to generate the status report'): TpmError {
    return new TpmError('AI_GENERATION_FAILED', message);
  }

  static notImplemented(feature: string): TpmError {
    return new TpmError('NOT_IMPLEMENTED', `${feature} is not implemented in v1. Planned for v2.`);
  }

  static internal(message = 'Internal server error'): TpmError {
    return new TpmError('INTERNAL_ERROR', message);
  }
}
