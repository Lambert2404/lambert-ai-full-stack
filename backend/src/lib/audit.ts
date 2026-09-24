import type { FastifyInstance, FastifyRequest } from 'fastify';
import { prisma } from './prisma.js';

/**
 * Write an immutable audit trail row. Never log secrets, tokens or document
 * contents here - only structured identifiers and a safe action label.
 */
export async function auditLog(input: {
  request?: Pick<FastifyRequest, 'ip' | 'headers'>;
  userId?: string | null;
  role?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const userAgent =
      input.request?.headers['user-agent'] && typeof input.request.headers['user-agent'] === 'string'
        ? (input.request.headers['user-agent'] as string)
        : undefined;
    await prisma.auditLog.create({
      data: {
        userId: input.userId ?? null,
        role: input.role ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        ip: input.request?.ip,
        userAgent,
        metadata: (input.metadata ?? undefined) as never,
      },
    });
  } catch {
    // Audit logging must never break the primary request path.
  }
}

export function registerAudit(build: FastifyInstance): void {
  build.decorate('audit', auditLog);
}

declare module 'fastify' {
  interface FastifyInstance {
    audit: typeof auditLog;
  }
}