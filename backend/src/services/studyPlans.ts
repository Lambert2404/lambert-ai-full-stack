import { prisma } from '../lib/prisma.js';
import { NotFoundError, ValidationError, ForbiddenError } from '../lib/errors.js';
import { createNotification } from './notify.js';
import type { AuthUser } from '../lib/auth.js';

const TIME_SLOTS = ['09:00', '11:00', '14:00', '16:00', '18:00'];
const DEFAULT_SESSION_MINUTES = 45;

async function subjectsFor(userId: string) {
  const selected = await prisma.userSubject.findMany({ where: { userId }, select: { subjectId: true } });
  if (selected.length > 0) {
    return prisma.subject.findMany({
      where: { id: { in: selected.map((s) => s.subjectId) }, isActive: true },
      orderBy: { order: 'asc' },
    });
  }
  return prisma.subject.findMany({ where: { isActive: true }, orderBy: { order: 'asc' } });
}

/**
 * AI-assisted study plan generation. Builds a real, implementable plan from
 * the learner's enrolled subjects/topics and available time.
 */
export async function generateStudyPlan(input: {
  user: AuthUser;
  examDate?: string;
  weeklyHoursTarget?: number;
}) {
  const subjects = await subjectsFor(input.user.id);
  if (subjects.length === 0) throw new NotFoundError('No subjects available to plan for.');

  const topics = await prisma.topic.findMany({
    where: { subjectId: { in: subjects.map((s) => s.id) }, isActive: true },
    orderBy: { order: 'asc' },
  });

  const weeklyHours = Math.min(Math.max(input.weeklyHoursTarget ?? 10, 2), 60);
  const daysUntil = daysUntilFrom(input.examDate, 30);
  const sessionsPerDay = Math.max(1, Math.round(weeklyHours / 7 / (DEFAULT_SESSION_MINUTES / 60)));

  const exam = input.examDate ? new Date(input.examDate) : null;
  const plan = await prisma.studyPlan.create({
    data: {
      userId: input.user.id,
      title: `Study plan for ${targetLabel(exam)}`,
      examDate: exam,
      createdBy: 'ai',
      weeklyHoursTarget: weeklyHours,
      isActive: true,
    },
  });

  // Deactivate older plans silently and keep the newest active.
  await prisma.studyPlan.updateMany({
    where: { userId: input.user.id, isActive: true, id: { not: plan.id } },
    data: { isActive: false },
  });

  let topicCursor = 0;
  let slotCursor = 0;
  const sessionRows: Array<{
    planId: string;
    title: string;
    subjectId: string;
    topicId?: string;
    date: Date;
    startTime: string | null;
    durationMinutes: number;
  }> = [];

  for (let day = 0; day < daysUntil; day++) {
    const date = new Date();
    date.setDate(date.getDate() + day);
    date.setHours(0, 0, 0, 0);

    for (let s = 0; s < sessionsPerDay; s++) {
      const subject = subjects[day % subjects.length]!;
      const subjectTopics = topics.filter((t) => t.subjectId === subject.id);
      if (subjectTopics.length === 0) continue;

      const topic = subjectTopics[topicCursor % subjectTopics.length]!;
      topicCursor++;

      sessionRows.push({
        planId: plan.id,
        title: topic.name,
        subjectId: subject.id,
        topicId: topic.id,
        date,
        startTime: TIME_SLOTS[slotCursor % TIME_SLOTS.length]!,
        durationMinutes: DEFAULT_SESSION_MINUTES,
      });
      slotCursor++;
    }
  }

  await prisma.studySession.createMany({ data: sessionRows as never });

  await createNotification(
    input.user.id,
    'study_plan',
    'Study plan created',
    `Your new ${daysUntil}-day study plan is ready with ${sessionRows.length} sessions.`
  );

  return prisma.studyPlan.findUnique({
    where: { id: plan.id },
    include: { sessions: { orderBy: [{ date: 'asc' }, { startTime: 'asc' }] } },
  });
}

export async function createManualPlan(input: {
  user: AuthUser;
  title?: string;
  examDate?: string;
  weeklyHoursTarget?: number;
  sessions?: Array<{ title: string; subjectId?: string; topicId?: string; date: string; startTime?: string; durationMinutes?: number }>;
}) {
  const plan = await prisma.studyPlan.create({
    data: {
      userId: input.user.id,
      title: input.title ?? 'My study plan',
      examDate: input.examDate ? new Date(input.examDate) : null,
      createdBy: 'user',
      weeklyHoursTarget: input.weeklyHoursTarget,
      isActive: true,
    },
  });
  await prisma.studyPlan.updateMany({
    where: { userId: input.user.id, isActive: true, id: { not: plan.id } },
    data: { isActive: false },
  });

  if (input.sessions?.length) {
    await prisma.studySession.createMany({
      data: input.sessions.map((s) => ({
        planId: plan.id,
        title: s.title,
        subjectId: s.subjectId,
        topicId: s.topicId,
        date: new Date(s.date),
        startTime: s.startTime ?? null,
        durationMinutes: s.durationMinutes ?? DEFAULT_SESSION_MINUTES,
      })) as never,
    });
  }
  return prisma.studyPlan.findUnique({
    where: { id: plan.id },
    include: { sessions: { orderBy: [{ date: 'asc' }, { startTime: 'asc' }] } },
  });
}

export async function patchSession(user: AuthUser, sessionId: string, patch: { status?: string; date?: string; startTime?: string; durationMinutes?: number; title?: string }) {
  const session = await prisma.studySession.findUnique({ where: { id: sessionId }, include: { plan: true } });
  if (!session) throw new NotFoundError('Study session not found');
  if (user.role !== 'admin' && session.plan.userId !== user.id) throw new ForbiddenError('Not your study session');

  const data: Record<string, unknown> = { title: patch.title, startTime: patch.startTime ?? null, durationMinutes: patch.durationMinutes };
  if (patch.date) data.date = new Date(patch.date);
  if (patch.status) {
    if (!['pending', 'completed', 'skipped'].includes(patch.status)) throw new ValidationError('Invalid session status');
    data.status = patch.status;
    data.completedAt = patch.status === 'completed' ? new Date() : null;
  }
  const updated = await prisma.studySession.update({ where: { id: sessionId }, data: data as never });

  if (patch.status === 'completed') {
    await prisma.studyActivity.create({
      data: {
        userId: user.id,
        subjectId: updated.subjectId ?? undefined,
        topicId: updated.topicId ?? undefined,
        type: 'study',
        minutes: updated.durationMinutes,
      },
    });
  }
  return updated;
}

export async function deleteSession(user: AuthUser, sessionId: string) {
  const session = await prisma.studySession.findUnique({ where: { id: sessionId }, include: { plan: true } });
  if (!session) throw new NotFoundError('Study session not found');
  if (user.role !== 'admin' && session.plan.userId !== user.id) throw new ForbiddenError('Not your study session');
  await prisma.studySession.delete({ where: { id: sessionId } });
}

export async function getActivePlanFor(userId: string) {
  return prisma.studyPlan.findFirst({
    where: { userId, isActive: true },
    orderBy: { updatedAt: 'desc' },
    include: { sessions: { orderBy: [{ date: 'asc' }, { startTime: 'asc' }] } },
  });
}

function daysUntilFrom(examDate: string | undefined, fallback: number): number {
  if (!examDate) return fallback;
  const diff = new Date(examDate).getTime() - Date.now();
  if (!Number.isFinite(diff) || diff <= 0) return fallback;
  return Math.min(Math.ceil(diff / 86400000), 365);
}

function targetLabel(exam: Date | null): string {
  if (!exam) return 'the next 30 days';
  return exam.toISOString().slice(0, 10);
}