/**
 * Error envelope helpers and the AppError hierarchy used across the API.
 * All failures surface through `errorHandler` as:
 *   { success: false, data: null, message, error: { code } }
 */

export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly meta?: Record<string, unknown>;

  constructor(status: number, code: string, message: string, meta?: Record<string, unknown>) {
    super(message);
    this.name = new.target.name;
    this.status = status;
    this.code = code;
    this.meta = meta;
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Invalid request data', meta?: Record<string, unknown>) {
    super(400, 'VALIDATION_ERROR', message, meta);
  }
}

export class AuthError extends AppError {
  constructor(code = 'UNAUTHORIZED', message = 'Authentication required') {
    super(401, code, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to perform this action') {
    super(403, 'FORBIDDEN', message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(404, 'NOT_FOUND', message);
  }
}

export class ConflictError extends AppError {
  constructor(code = 'CONFLICT', message = 'Resource already exists') {
    super(409, code, message);
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Too many requests. Please slow down.') {
    super(429, 'RATE_LIMITED', message);
  }
}

export class UnavailableError extends AppError {
  constructor(code = 'SERVICE_UNAVAILABLE', message = 'The requested service is unavailable') {
    super(503, code, message);
  }
}

/** Thrown when no AI provider can complete the requested task. */
export class AiUnavailableError extends UnavailableError {
  constructor(message = 'No AI provider is currently available. Configure a provider or check API keys.') {
    super('AI_PROVIDER_UNAVAILABLE', message);
  }
}