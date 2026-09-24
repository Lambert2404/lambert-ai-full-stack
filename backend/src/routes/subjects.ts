import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';

const iconKeys = ['calculator', 'atom', 'flask', 'dna', 'code', 'leaf', 'building', 'zap', 'cog', 'briefcase', 'trending-up', 'bar-chart', 'terminal', 'network', 'dollar', 'globe'];

export async function subjectRoutes(app: FastifyInstance) {
  app.get('/api/subjects', { schema: { tags: ['Subjects'] } }, async (_request, reply) => {
    const subjects = await prisma.subject.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
      include: { _count: { select: { topics: true } } },
    });
    const data = subjects.map((s, i) => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
      description: s.description ?? '',
      iconKey: iconKeys[i] ?? s.iconKey,
      topicCount: s._count.topics,
    }));
    return reply.send({ success: true, data, message: null, error: null });
  });

  app.get('/api/subjects/:id', { schema: { tags: ['Subjects'] } }, async (request, reply) => {
    const subject = await prisma.subject.findUnique({ where: { id: (request.params as { id: string }).id } });
    if (!subject) return reply.code(404).send({ success: false, data: null, message: 'Subject not found', error: { code: 'NOT_FOUND' } });
    return reply.send({ success: true, data: subject, message: null, error: null });
  });

  app.get('/api/subjects/:id/topics', { schema: { tags: ['Subjects'] } }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const subject = await prisma.subject.findUnique({ where: { id } });
    if (!subject) return reply.code(404).send({ success: false, data: null, message: 'Subject not found', error: { code: 'NOT_FOUND' } });
    const topics = await prisma.topic.findMany({ where: { subjectId: id, isActive: true }, orderBy: { order: 'asc' } });
    return reply.send({
      success: true,
      data: topics.map((t) => ({ id: t.id, subjectId: t.subjectId, name: t.name, description: t.description ?? '', difficulty: t.difficulty })),
      message: null,
      error: null,
    });
  });

  app.get('/api/topics/:id', { schema: { tags: ['Subjects'] } }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const topic = await prisma.topic.findUnique({
      where: { id },
      include: { subject: { select: { name: true } } },
    });
    if (!topic) return reply.code(404).send({ success: false, data: null, message: 'Topic not found', error: { code: 'NOT_FOUND' } });
    return reply.send({
      success: true,
      data: {
        id: topic.id,
        subjectId: topic.subjectId,
        name: topic.name,
        description: topic.description ?? '',
        difficulty: topic.difficulty,
        subjectName: topic.subject.name,
        content: topic.materialMeta ?? undefined,
      },
      message: null,
      error: null,
    });
  });
}