import type { FastifyInstance } from 'fastify';
import type cors from '@fastify/cors';

/**
 * Security hardening shared across the app: CORS, CSP/header defaults and
 * conservative global + per-route rate limits.
 */

export const corsOptions = (instance: FastifyInstance): cors.FastifyCorsOptions => {
  const { corsOrigins, isProd } = instance.config;
  return {
    // Allow all origins in dev or when CORS_ORIGINS=*. In production, restrict
    // to the exact origins configured in CORS_ORIGINS (comma-separated).
    origin: !isProd || corsOrigins.includes('*') ? true : corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    maxAge: 86400,
  };
};

export const helmetOptions = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  hsts: true,
  noSniff: true,
  referrerPolicy: { policy: 'no-referrer' as const },
};

/** Global default limit: 120 requests/minute/IP. */
export const GLOBAL_RATE_LIMIT = {
  max: 120,
  timeWindow: '1 minute',
} as const;

export const publicRateLimit = {
  max: 60,
  timeWindow: '1 minute',
} as const;

export const strictRateLimit = {
  max: 10,
  timeWindow: '1 minute',
} as const;

export const aiRateLimit = {
  max: 30,
  timeWindow: '1 minute',
} as const;

export const uploadRateLimit = {
  max: 20,
  timeWindow: '1 minute',
} as const;

export function registerRateLimit(instance: FastifyInstance, opts: { max: number; timeWindow: string }): void {
  instance.register(import('@fastify/rate-limit'), {
    max: opts.max,
    timeWindow: opts.timeWindow,
    errorResponseBuilder: (_req, _context) => ({
      success: false,
      data: null,
      message: 'Too many requests. Please slow down.',
      error: { code: 'RATE_LIMITED' },
    }),
  });
}