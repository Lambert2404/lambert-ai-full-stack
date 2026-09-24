import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRole } from '../lib/auth.js';
import { NotFoundError, ValidationError } from '../lib/errors.js';
import { replyOk } from '../lib/envelope.js';
import { parsePagination, slugify } from '../lib/util.js';
import { loadProviderDefs, invalidateProviderCache } from '../providers/registry.js';

const ADMIN_GUARD = { preHandler: [authenticate, requireRole('admin')] };

const userPatchSchema = z.object({
  role: z.enum(['student', 'teacher', 'admin']).optional(),
  isActive: z.boolean().optional(),
  name: z.string().trim().min(2).max(120).optional(),
});

const subjectSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional(),
  iconKey: z.string().trim().max(40).optional(),
  order: z.number().int().optional(),
});

const topicSchema = z.object({
  subjectId: z.string().min(1),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
  order: z.number().int().optional(),
});

const providerPatchSchema = z.object({
  enabled: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  isFallback: z.boolean().optional(),
  priority: z.number().int().min(0).max(1000).optional(),
  model: z.string().trim().min(1).optional(),
  label: z.string().trim().min(1).max(80).optional(),
});

const modelPatchSchema = z.object({
  status: z.enum(['online', 'degraded', 'offline']).optional(),
  isDefault: z.boolean().optional(),
  isFallback: z.boolean().optional(),
  modelName: z.string().trim().min(1).optional(),
});

export async function adminRoutes(app: FastifyInstance) {
  // ---- Metrics dashboard --------------------------------------------------

  app.get('/api/admin/metrics', ADMIN_GUARD, async (_request, reply) => {
    const [students, activeUsers, aiRequests, quizAttempts, documents, errors24h] = await Promise.all([
      prisma.user.count({ where: { role: 'student' } }),
      prisma.user.count({ where: { lastLoginAt: { gte: new Date(Date.now() - 24 * 3600 * 1000) } } }),
      prisma.aiUsage.count(),
      prisma.quizAttempt.count({ where: { submittedAt: { not: null } } }),
      prisma.studyMaterial.count(),
      prisma.aiUsage.count({ where: { status: 'error', createdAt: { gte: new Date(Date.now() - 24 * 3600 * 1000) } } }),
    ]);
    return replyOk(reply, { students, activeUsers, aiRequests, quizAttempts, documents, errorsLast24h: errors24h });
  });

  app.get('/api/admin/users', ADMIN_GUARD, async (request, reply) => {
    const query = request.query as { page?: string; pageSize?: string; q?: string; role?: string };
    const { page, pageSize, skip, take } = parsePagination(query);
    const term = query.q?.trim();
    const where = {
      ...(term ? { OR: [{ name: { contains: term } }, { email: { contains: term } }] } : {}),
      ...(query.role ? { role: query.role } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.user.findMany({ where: where as never, orderBy: { createdAt: 'desc' }, skip, take }),
      prisma.user.count({ where: where as never }),
    ]);
    return replyOk(reply, {
      items: items.map(safeUser),
      page,
      pageSize,
      total,
    });
  });

  app.patch('/api/admin/users/:id', ADMIN_GUARD, async (request, reply) => {
    const parsed = userPatchSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError('Invalid user patch');
    const user = await prisma.user.findUnique({ where: { id: (request.params as { id: string }).id } });
    if (!user) throw new NotFoundError('User not found');
    const updated = await prisma.user.update({ where: { id: user.id }, data: parsed.data });
    await app.audit({ request, userId: request.user!.id, role: 'admin', action: 'admin.update_user', entityType: 'user', entityId: user.id });
    return replyOk(reply, safeUser(updated));
  });

  // ---- Subjects / Topics management ---------------------------------------

  app.post('/api/admin/subjects', ADMIN_GUARD, async (request, reply) => {
    const parsed = subjectSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError('Invalid subject data');
    const subject = await prisma.subject.create({
      data: { ...parsed.data, slug: slugify(parsed.data.name) },
    });
    return reply.status(201).send({ success: true, data: subject, message: null, error: null });
  });

  app.patch('/api/admin/subjects/:id', ADMIN_GUARD, async (request, reply) => {
    const parsed = subjectSchema.partial().safeParse(request.body);
    if (!parsed.success) throw new ValidationError('Invalid subject patch');
    const subject = await prisma.subject.findUnique({ where: { id: (request.params as { id: string }).id } });
    if (!subject) throw new NotFoundError('Subject not found');
    const updated = await prisma.subject.update({
      where: { id: subject.id },
      data: { ...parsed.data, ...(parsed.data.name ? { slug: slugify(parsed.data.name) } : {}) },
    });
    return replyOk(reply, updated);
  });

  app.delete('/api/admin/subjects/:id', ADMIN_GUARD, async (request, reply) => {
    const subject = await prisma.subject.findUnique({ where: { id: (request.params as { id: string }).id } });
    if (!subject) throw new NotFoundError('Subject not found');
    await prisma.subject.update({ where: { id: subject.id }, data: { isActive: false } });
    return replyOk(reply, null, 'Subject disabled');
  });

  app.post('/api/admin/topics', ADMIN_GUARD, async (request, reply) => {
    const parsed = topicSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError('Invalid topic data');
    const topic = await prisma.topic.create({ data: parsed.data });
    return reply.status(201).send({ success: true, data: topic, message: null, error: null });
  });

  app.patch('/api/admin/topics/:id', ADMIN_GUARD, async (request, reply) => {
    const parsed = topicSchema.partial().safeParse(request.body);
    if (!parsed.success) throw new ValidationError('Invalid topic patch');
    const topic = await prisma.topic.findUnique({ where: { id: (request.params as { id: string }).id } });
    if (!topic) throw new NotFoundError('Topic not found');
    const updated = await prisma.topic.update({ where: { id: topic.id }, data: parsed.data });
    return replyOk(reply, updated);
  });

  app.delete('/api/admin/topics/:id', ADMIN_GUARD, async (request, reply) => {
    const topic = await prisma.topic.findUnique({ where: { id: (request.params as { id: string }).id } });
    if (!topic) throw new NotFoundError('Topic not found');
    await prisma.topic.update({ where: { id: topic.id }, data: { isActive: false } });
    return replyOk(reply, null, 'Topic disabled');
  });

  app.get('/api/admin/topics', ADMIN_GUARD, async (_request, reply) => {
    const topics = await prisma.topic.findMany({ orderBy: [{ subjectId: 'asc' }, { order: 'asc' }], take: 200 });
    return replyOk(reply, topics);
  });

  // ---- Materials / quizzes ------------------------------------------------

  app.get('/api/admin/materials', ADMIN_GUARD, async (_request, reply) => {
    const materials = await prisma.studyMaterial.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { user: { select: { name: true, email: true } } },
    });
    return replyOk(
      reply,
      materials.map((m) => ({ ...m, owner: m.user?.email, user: undefined }))
    );
  });

  app.delete('/api/admin/materials/:id', ADMIN_GUARD, async (request, reply) => {
    const material = await prisma.studyMaterial.findUnique({ where: { id: (request.params as { id: string }).id } });
    if (!material) throw new NotFoundError('Material not found');
    await prisma.studyMaterial.delete({ where: { id: material.id } });
    return replyOk(reply, null, 'Material deleted');
  });

  app.get('/api/admin/quizzes', ADMIN_GUARD, async (_request, reply) => {
    const quizzes = await prisma.quiz.findMany({ orderBy: { createdAt: 'desc' }, take: 200 });
    return replyOk(reply, quizzes);
  });

  app.delete('/api/admin/quizzes/:id', ADMIN_GUARD, async (request, reply) => {
    const quiz = await prisma.quiz.findUnique({ where: { id: (request.params as { id: string }).id } });
    if (!quiz) throw new NotFoundError('Quiz not found');
    await prisma.quiz.delete({ where: { id: quiz.id } });
    return replyOk(reply, null, 'Quiz deleted');
  });

  // ---- AI provider / model administration ----------------------------------

  app.get('/api/admin/ai/providers', ADMIN_GUARD, async (_request, reply) => {
    await loadProviderDefs(true);
    const rows = await prisma.aiProvider.findMany({ orderBy: { priority: 'asc' } });
    return replyOk(
      reply,
      rows.map((r) => ({
        id: r.id,
        code: r.code,
        label: r.label,
        enabled: r.enabled,
        isDefault: r.isDefault,
        isFallback: r.isFallback,
        priority: r.priority,
        model: extractModel(r.config),
      }))
    );
  });

  app.patch('/api/admin/ai/providers/:id', ADMIN_GUARD, async (request, reply) => {
    const parsed = providerPatchSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError('Invalid provider patch');
    const provider = await prisma.aiProvider.findUnique({ where: { id: (request.params as { id: string }).id } });
    if (!provider) throw new NotFoundError('Provider not found');

    if (parsed.data.isDefault === true) {
      await prisma.aiProvider.updateMany({ where: { id: { not: provider.id } }, data: { isDefault: false } });
    }
    const configNext = extractConfigObject(provider.config);
    if (parsed.data.model) configNext.model = parsed.data.model;

    const updated = await prisma.aiProvider.update({
      where: { id: provider.id },
      data: {
        ...(parsed.data.enabled !== undefined ? { enabled: parsed.data.enabled } : {}),
        ...(parsed.data.isDefault !== undefined ? { isDefault: parsed.data.isDefault } : {}),
        ...(parsed.data.isFallback !== undefined ? { isFallback: parsed.data.isFallback } : {}),
        ...(parsed.data.priority !== undefined ? { priority: parsed.data.priority } : {}),
        ...(parsed.data.label !== undefined ? { label: parsed.data.label } : {}),
        config: configNext as never,
      },
    });
    invalidateProviderCache();
    await app.audit({ request, userId: request.user!.id, role: 'admin', action: 'admin.update_ai_provider', entityType: 'ai_provider', entityId: provider.id });
    return replyOk(reply, { ...updated, config: undefined });
  });

  app.get('/api/admin/ai/models', ADMIN_GUARD, async (_request, reply) => {
    const models = await prisma.aiModel.findMany({ include: { provider: { select: { code: true, label: true } } } });
    if (models.length === 0) {
      const defs = await loadProviderDefs();
      return replyOk(
        reply,
        defs.map((d) => ({
          providerId: d.code,
          modelName: d.model,
          status: d.enabled ? 'online' : 'offline',
          isDefault: d.isDefault,
          isFallback: d.isFallback,
        }))
      );
    }
    return replyOk(
      reply,
      models.map((m) => ({
        id: m.id,
        providerId: m.provider.code,
        modelName: m.modelName,
        status: m.status,
        isDefault: m.isDefault,
        isFallback: m.isFallback,
        avgLatencyMs: m.avgLatencyMs ?? undefined,
        errorRatePercent: m.errorRatePercent ?? undefined,
        requestsToday: m.requestsToday,
      }))
    );
  });

  app.patch('/api/admin/ai/models/:id', ADMIN_GUARD, async (request, reply) => {
    const parsed = modelPatchSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError('Invalid model patch');
    const model = await prisma.aiModel.findUnique({ where: { id: (request.params as { id: string }).id } });
    if (!model) throw new NotFoundError('Model not found');
    if (parsed.data.isDefault) {
      await prisma.aiModel.updateMany({ where: { id: { not: model.id } }, data: { isDefault: false } });
    }
    const updated = await prisma.aiModel.update({ where: { id: model.id }, data: parsed.data });
    return replyOk(reply, updated);
  });

  app.get('/api/admin/ai/usage', ADMIN_GUARD, async (_request, reply) => {
    const [recent, byProvider, daily] = await Promise.all([
      prisma.aiUsage.findMany({ orderBy: { createdAt: 'desc' }, take: 200 }),
      prisma.aiUsage.groupBy({ by: ['providerCode'], _sum: { requestCount: true, estimatedCost: true, latencyMs: true }, _count: true }),
      prisma.aiUsage.groupBy({ by: ['createdAt'], _sum: { requestCount: true }, orderBy: { createdAt: 'desc' } }),
    ]);
    return replyOk(reply, {
      recent,
      byProvider: byProvider.map((b) => ({ providerCode: b.providerCode, requests: b._count, cost: b._sum.estimatedCost ?? 0, latencyMs: b._sum.latencyMs ?? 0 })),
      daily: daily
        .slice(0, 30)
        .map((d) => ({ date: d.createdAt.toISOString().slice(0, 10), requests: d._sum.requestCount ?? 0 })),
    });
  });

  app.get('/api/admin/ai/errors', ADMIN_GUARD, async (_request, reply) => {
    const errors = await prisma.aiUsage.findMany({
      where: { status: 'error' },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return replyOk(reply, errors.map((e) => ({ ...e, createdAt: e.createdAt.toISOString() })));
  });

  // ---- Feedback & logs ------------------------------------------------------

  app.get('/api/admin/feedback', ADMIN_GUARD, async (_request, reply) => {
    const feedback = await prisma.feedback.findMany({ orderBy: { createdAt: 'desc' }, take: 200 });
    return replyOk(reply, feedback);
  });

  app.get('/api/admin/logs', ADMIN_GUARD, async (_request, reply) => {
    const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 300 });
    return replyOk(reply, logs);
  });

  app.get('/api/admin/analytics', ADMIN_GUARD, async (_request, reply) => {
    const [usersByRole, attempts, activityRecent] = await Promise.all([
      prisma.user.groupBy({ by: ['role'], _count: true }),
      prisma.quizAttempt.findMany({ where: { submittedAt: { not: null } }, orderBy: { submittedAt: 'desc' }, take: 200, include: { quiz: { select: { subjectId: true } } } }),
      prisma.studyActivity.findMany({ orderBy: { happenedAt: 'desc' }, take: 200 }),
    ]);
    return replyOk(reply, {
      usersByRole: usersByRole.map((u) => ({ role: u.role, count: u._count })),
      quizAttempts: attempts.length,
      recentActivity: activityRecent.length,
    });
  });
}

function safeUser(u: {
  id: string;
  email: string;
  name: string;
  role: string;
  avatarUrl: string | null;
  isActive: boolean;
  emailVerified: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    avatarUrl: u.avatarUrl ?? undefined,
    isActive: u.isActive,
    emailVerified: u.emailVerified,
    lastLoginAt: u.lastLoginAt?.toISOString() ?? undefined,
    createdAt: u.createdAt.toISOString(),
  };
}

function extractConfigObject(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === 'object') return { ...(raw as Record<string, unknown>) };
  return {};
}

function extractModel(raw: unknown): string | undefined {
  const cfg = extractConfigObject(raw);
  return typeof cfg.model === 'string' ? cfg.model : undefined;
}