import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../lib/auth.js';
import { NotFoundError, ValidationError } from '../lib/errors.js';
import { replyOk } from '../lib/envelope.js';

const prefSchema = z.object({
  type: z.enum(['study_reminder', 'quiz_result', 'study_plan', 'new_material', 'achievement', 'system']),
  email: z.boolean().optional(),
  push: z.boolean().optional(),
});

export async function notificationRoutes(app: FastifyInstance) {
  app.get('/api/notifications', { preHandler: authenticate }, async (request, reply) => {
    const notifications = await prisma.notification.findMany({
      where: { userId: request.user!.id, archived: false },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return replyOk(reply, notifications.map(toDto));
  });

  app.patch('/api/notifications/:id', { preHandler: authenticate }, async (request, reply) => {
    const id = (request.params as { id: string }).id;
    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification || notification.userId !== request.user!.id) throw new NotFoundError('Notification not found');

    const body = (request.body ?? {}) as { read?: boolean; archived?: boolean };
    const updated = await prisma.notification.update({
      where: { id },
      data: {
        ...(body.read !== undefined ? { read: body.read } : {}),
        ...(body.archived !== undefined ? { archived: body.archived } : {}),
      },
    });
    return replyOk(reply, toDto(updated));
  });

  app.post('/api/notifications/read-all', { preHandler: authenticate }, async (request, reply) => {
    await prisma.notification.updateMany({
      where: { userId: request.user!.id, read: false },
      data: { read: true },
    });
    return replyOk(reply, null, 'All notifications marked as read');
  });

  app.get('/api/notifications/preferences', { preHandler: authenticate }, async (request, reply) => {
    const prefs = await prisma.notificationPreference.findMany({ where: { userId: request.user!.id } });
    return replyOk(reply, prefs);
  });

  app.post('/api/notifications/preferences', { preHandler: authenticate }, async (request, reply) => {
    const parsed = prefSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError('Invalid notification preference');
    const pref = await prisma.notificationPreference.upsert({
      where: { userId_type: { userId: request.user!.id, type: parsed.data.type } },
      create: { userId: request.user!.id, type: parsed.data.type, email: parsed.data.email ?? true, push: parsed.data.push ?? true },
      update: {
        ...(parsed.data.email !== undefined ? { email: parsed.data.email } : {}),
        ...(parsed.data.push !== undefined ? { push: parsed.data.push } : {}),
      },
    });
    return replyOk(reply, pref);
  });
}

function toDto(n: { id: string; type: string; title: string; body: string; read: boolean; archived: boolean; createdAt: Date; data: unknown }) {
  return {
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    read: n.read,
    archived: n.archived,
    createdAt: n.createdAt.toISOString(),
    data: n.data as Record<string, unknown> | undefined,
  };
}