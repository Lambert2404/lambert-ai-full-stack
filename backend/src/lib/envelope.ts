import type { FastifyReply } from 'fastify';

export interface Envelope<T = unknown> {
  success: boolean;
  data: T | null;
  message: string | null;
  error: { code: string } | null;
}

export function ok<T>(data: T, message: string | null = null): Envelope<T> {
  return { success: true, data, message, error: null };
}

export function fail(code: string, message: string): Envelope<null> {
  return { success: false, data: null, message, error: { code } };
}

/** Reply helper so route handlers stay DRY. */
export function replyOk<T>(reply: FastifyReply, data: T, message: string | null = null, status = 200): FastifyReply {
  return reply.status(status).send(ok(data, message));
}

/** Shared OpenAPI schema helper for the standard envelope. */
export function envelopeSchema(dataSchema: Record<string, unknown>): Record<string, unknown> {
  // fast-json-stringify emits ONLY declared properties, so keep data pass-through
  // open when the payload shape is not exhaustively described.
  const data =
    dataSchema.type === 'object' && !dataSchema.additionalProperties
      ? { ...dataSchema, additionalProperties: true }
      : dataSchema;
  return {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      data,
      message: { type: ['string', 'null'] },
      error: { type: ['object', 'null'], properties: { code: { type: 'string' } } },
    },
  };
}