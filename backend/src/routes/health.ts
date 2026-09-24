import type { FastifyInstance } from 'fastify';
import { config } from '../config.js';
import { prisma } from '../lib/prisma.js';

export async function healthRoutes(app: FastifyInstance) {
  const status = async () => {
    let db = 'up';
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      db = 'down';
    }
    return {
      status: db === 'up' ? 'ok' : 'degraded',
      service: 'lambert-ai-backend',
      version: '1.0.0',
      env: config.env,
      db,
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  };

  app.get('/health', { schema: { tags: ['Health'] } }, async (_request, reply) => {
    return reply.send({ success: true, data: await status(), message: null, error: null });
  });
  app.get('/api/health', { schema: { tags: ['Health'] } }, async (_request, reply) => {
    return reply.send({ success: true, data: await status(), message: null, error: null });
  });
}