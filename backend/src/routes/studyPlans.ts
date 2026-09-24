import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../lib/auth.js';
import { NotFoundError, ValidationError, ForbiddenError } from '../lib/errors.js';
import { replyOk } from '../lib/envelope.js';
import { generateStudyPlan, createManualPlan, patchSession, deleteSession, getActivePlanFor } from '../services/studyPlans.js';

const planSchema = z.object({
  title: z.string().trim().max(160).optional(),
  examDate: z.string().optional(),
  weeklyHoursTarget: z.number().int().min(2).max(60).optional(),
  sessions: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(160),
        subjectId: z.string().optional(),
        topicId: z.string().optional(),
        date: z.string(),
        startTime: z.string().optional(),
        durationMinutes: z.number().int().min(5).max(480).optional(),
      })
    )
    .max(200)
    .optional(),
});

export async function studyPlanRoutes(app: FastifyInstance) {
  app.get('/api/study-plans/active', { preHandler: authenticate }, async (request, reply) => {
    const plan = await getActivePlanFor(request.user!.id);
    if (!plan) return replyOk(reply, null, 'No active study plan');
    return replyOk(reply, plan);
  });

  app.get('/api/study-plans', { preHandler: authenticate }, async (request, reply) => {
    const plans = await prisma.studyPlan.findMany({
      where: { userId: request.user!.id },
      orderBy: { createdAt: 'desc' },
      include: { sessions: { orderBy: { date: 'asc' } } },
    });
    return replyOk(reply, plans);
  });

  app.post('/api/study-plans', { preHandler: authenticate }, async (request, reply) => {
    const parsed = planSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError('Invalid study plan data');
    const plan = await createManualPlan({ user: request.user!, ...parsed.data });
    return reply.status(201).send({ success: true, data: plan, message: null, error: null });
  });

  app.post('/api/study-plans/generate', { preHandler: authenticate, config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (request, reply) => {
    const body = (request.body ?? {}) as { examDate?: string; weeklyHoursTarget?: number };
    const plan = await generateStudyPlan({ user: request.user!, examDate: body.examDate, weeklyHoursTarget: body.weeklyHoursTarget });
    return reply.status(201).send({ success: true, data: plan, message: 'Study plan generated', error: null });
  });

  app.get('/api/study-plans/:id', { preHandler: authenticate }, async (request, reply) => {
    const plan = await ownedPlan(request.user!, (request.params as { id: string }).id);
    return replyOk(reply, plan);
  });

  app.patch('/api/study-plans/:id', { preHandler: authenticate }, async (request, reply) => {
    const plan = await ownedPlan(request.user!, (request.params as { id: string }).id);
    const body = (request.body ?? {}) as { title?: string; examDate?: string; weeklyHoursTarget?: number };
    const updated = await prisma.studyPlan.update({
      where: { id: plan.id },
      data: {
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.examDate !== undefined ? { examDate: body.examDate ? new Date(body.examDate) : null } : {}),
        ...(body.weeklyHoursTarget !== undefined ? { weeklyHoursTarget: body.weeklyHoursTarget } : {}),
      },
    });
    return replyOk(reply, updated);
  });

  app.delete('/api/study-plans/:id', { preHandler: authenticate }, async (request, reply) => {
    const plan = await ownedPlan(request.user!, (request.params as { id: string }).id);
    await prisma.studyPlan.delete({ where: { id: plan.id } });
    return replyOk(reply, null, 'Study plan deleted');
  });

  // ---- Sessions ----------------------------------------------------------

  app.patch('/api/study-sessions/:id', { preHandler: authenticate }, async (request, reply) => {
    const body = (request.body ?? {}) as { status?: string; date?: string; startTime?: string; durationMinutes?: number; title?: string };
    const session = await patchSession(request.user!, (request.params as { id: string }).id, body);
    return replyOk(reply, session);
  });

  app.delete('/api/study-sessions/:id', { preHandler: authenticate }, async (request, reply) => {
    await deleteSession(request.user!, (request.params as { id: string }).id);
    return replyOk(reply, null, 'Study session deleted');
  });
}

async function ownedPlan(user: { id: string; role: string }, planId: string) {
  const plan = await prisma.studyPlan.findUnique({
    where: { id: planId },
    include: { sessions: { orderBy: [{ date: 'asc' }, { startTime: 'asc' }] } },
  });
  if (!plan) throw new NotFoundError('Study plan not found');
  if (user.role !== 'admin' && plan.userId !== user.id) throw new ForbiddenError('Access denied');
  return plan;
}