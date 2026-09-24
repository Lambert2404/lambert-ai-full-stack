import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../lib/auth.js';
import { replyOk } from '../lib/envelope.js';

export async function searchRoutes(app: FastifyInstance) {
  app.get('/api/search', { preHandler: authenticate }, async (request, reply) => {
    const query = request.query as { q?: string; type?: string; subjectId?: string };
    const term = (query.q ?? '').trim();
    const type = query.type;
    const subjectId = query.subjectId;

    const results: Array<Record<string, unknown>> = [];

    if (!type || type === 'subject') {
      const subjects = await prisma.subject.findMany({
        where: term ? { isActive: true, OR: [{ name: { contains: term } }, { description: { contains: term } }] } : { isActive: true },
        take: 10,
      });
      for (const s of subjects) results.push({ kind: 'subject', id: s.id, name: s.name });
    }
    if (!type || type === 'topic') {
      const where = {
        ...(subjectId ? { subjectId } : {}),
        ...(term ? { OR: [{ name: { contains: term } }, { description: { contains: term } }] } : {}),
      };
      const topics = await prisma.topic.findMany({ where, take: 10 });
      for (const t of topics) results.push({ kind: 'topic', id: t.id, name: t.name, subjectId: t.subjectId });
    }
    if (!type || type === 'material') {
      const materials = await prisma.studyMaterial.findMany({
        where: { userId: request.user!.id, ...(term ? { name: { contains: term } } : {}) },
        take: 10,
      });
      for (const m of materials) results.push({ kind: 'material', id: m.id, name: m.name, fileType: m.fileType });
    }
    if (!type || type === 'conversation') {
      const conversations = await prisma.conversation.findMany({
        where: { userId: request.user!.id, ...(term ? { title: { contains: term } } : {}) },
        take: 10,
      });
      for (const c of conversations) results.push({ kind: 'conversation', id: c.id, name: c.title, mode: c.mode });
    }
    if (!type || type === 'quiz') {
      const quizzes = await prisma.quiz.findMany({
        where: {
          isPublic: true,
          ...(subjectId ? { subjectId } : {}),
          ...(term ? { title: { contains: term } } : {}),
        },
        take: 10,
      });
      for (const q of quizzes) results.push({ kind: 'quiz', id: q.id, name: q.title, subjectId: q.subjectId });
    }

    return replyOk(reply, results.slice(0, 40));
  });
}