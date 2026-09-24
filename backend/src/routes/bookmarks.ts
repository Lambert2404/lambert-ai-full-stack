import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../lib/auth.js';
import { NotFoundError, ValidationError } from '../lib/errors.js';
import { replyOk } from '../lib/envelope.js';

const bookmarkSchema = z.object({
  targetType: z.enum(['material', 'topic', 'conversation', 'quiz']),
  targetId: z.string().min(1),
  note: z.string().trim().max(240).optional(),
});

export async function bookmarkRoutes(app: FastifyInstance) {
  app.get('/api/bookmarks', { preHandler: authenticate }, async (request, reply) => {
    const bookmarks = await prisma.bookmark.findMany({
      where: { userId: request.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return replyOk(reply, bookmarks);
  });

  app.post('/api/bookmarks', { preHandler: authenticate }, async (request, reply) => {
    const parsed = bookmarkSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError('Invalid bookmark payload');

    const existing = await prisma.bookmark.findUnique({
      where: { userId_targetType_targetId: { userId: request.user!.id, targetType: parsed.data.targetType, targetId: parsed.data.targetId } },
    });
    if (existing) return replyOk(reply, existing, 'Already bookmarked');

    const bookmark = await prisma.bookmark.create({
      data: { userId: request.user!.id, ...parsed.data },
    });
    return reply.status(201).send({ success: true, data: bookmark, message: null, error: null });
  });

  app.delete('/api/bookmarks/:id', { preHandler: authenticate }, async (request, reply) => {
    const bookmark = await prisma.bookmark.findUnique({ where: { id: (request.params as { id: string }).id } });
    if (!bookmark || bookmark.userId !== request.user!.id) throw new NotFoundError('Bookmark not found');
    await prisma.bookmark.delete({ where: { id: bookmark.id } });
    return replyOk(reply, null, 'Bookmark removed');
  });
}