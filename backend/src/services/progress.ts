import { prisma } from '../lib/prisma.js';
import { NotFoundError } from '../lib/errors.js';
import type { AuthUser } from '../lib/auth.js';
import type { Prisma } from '@prisma/client';
import type { QuestionDifficulty } from '../types.js';

/**
 * LAMBERT Learning Engine (§22): LEARN -> PRACTICE -> ASSESS -> IDENTIFY
 * WEAKNESS -> REVIEW -> PRACTICE -> RE-ASSESS. All analytics are computed
 * from real data stored by the quiz engine, study planner and document
 * activity - nothing fabricated.
 */

const WEAK_MASTERY = 60;

async function subjectsFor(userId: string) {
  const selected = await prisma.userSubject.findMany({ where: { userId }, select: { subjectId: true } });
  const where: Prisma.SubjectWhereInput =
    selected.length > 0
      ? { id: { in: selected.map((s) => s.subjectId) }, isActive: true }
      : { isActive: true };
  return prisma.subject.findMany({
    where,
    orderBy: { order: 'asc' },
    include: { topics: { where: { isActive: true } } },
  });
}

export async function getProgressSummary(user: AuthUser) {
  const subjects = await subjectsFor(user.id);
  const subjectIds = subjects.map((s) => s.id);

  const [todayStart, yesterdayStart] = startOfDayOffsets(0, 1) as unknown as [Date, Date];
  const now = new Date();

  const [todayActivities, allActivities, attempts, topicProgress, totalTopics] = await Promise.all([
    prisma.studyActivity.aggregate({
      where: { userId: user.id, happenedAt: { gte: todayStart } },
      _sum: { minutes: true },
    }),
    prisma.studyActivity.findMany({
      where: { userId: user.id, happenedAt: { gte: yesterdayStart } },
      orderBy: { happenedAt: 'desc' },
      select: { happenedAt: true },
    }),
    prisma.quizAttempt.findMany({
      where: { userId: user.id, submittedAt: { not: null } },
      select: { scorePercent: true },
    }),
    prisma.topicProgress.findMany({ where: { userId: user.id, isCompleted: true } }),
    prisma.topic.count({ where: { subjectId: { in: subjectIds }, isActive: true } }),
  ]);

  const completedTopics = topicProgress.length;
  const scoreSum = attempts.reduce((acc, a) => acc + (a.scorePercent ?? 0), 0);
  const quizAverage = attempts.length ? Math.round((scoreSum / attempts.length) * 10) / 10 : 0;

  return {
    streakDays: computeStreak(allActivities, now, yesterdayStart),
    studyMinutesToday: todayActivities._sum.minutes ?? 0,
    quizAverage,
    completedTopics,
    totalTopics,
  };
}

export async function getSubjectProgress(user: AuthUser) {
  const subjects = await subjectsFor(user.id);

  const [topicProgress, attempts] = await Promise.all([
    prisma.topicProgress.findMany({ where: { userId: user.id } }),
    prisma.quizAttempt.findMany({
      where: { userId: user.id, submittedAt: { not: null } },
      include: { quiz: { select: { subjectId: true } } },
    }),
  ]);

  const attemptsBySubject = new Map<string, number[]>();
  for (const a of attempts) {
    const list = attemptsBySubject.get(a.quiz.subjectId) ?? [];
    list.push(a.scorePercent ?? 0);
    attemptsBySubject.set(a.quiz.subjectId, list);
  }

  const result = [];
  for (const subject of subjects) {
    const topicIds = subject.topics.map((t) => t.id);
    const completed = topicProgress.filter((tp) => topicIds.includes(tp.topicId) && tp.isCompleted).length;
    const progressPercent = topicIds.length ? Math.round((completed / topicIds.length) * 1000) / 10 : 0;
    const scores = attemptsBySubject.get(subject.id) ?? [];
    const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    result.push({
      subjectId: subject.id,
      subjectName: subject.name,
      progressPercent,
      quizAverage: Math.round(avg * 10) / 10,
    });
  }
  return result;
}

export async function getStudyTime(user: AuthUser, days = 14) {
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  from.setDate(from.getDate() - (days - 1));

  const activities = await prisma.studyActivity.findMany({
    where: { userId: user.id, happenedAt: { gte: from } },
    select: { happenedAt: true, minutes: true },
  });

  const byDay = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const d = new Date(from);
    d.setDate(d.getDate() + i);
    byDay.set(dayKey(d), 0);
  }
  for (const a of activities) {
    const key = dayKey(a.happenedAt);
    byDay.set(key, (byDay.get(key) ?? 0) + a.minutes);
  }
  return [...byDay.entries()].map(([date, minutes]) => ({ date, minutes }));
}

export async function getWeakTopics(user: AuthUser) {
  const rows = await prisma.topicProgress.findMany({
    where: { userId: user.id, masteryPercent: { lt: WEAK_MASTERY } },
    orderBy: { masteryPercent: 'asc' },
    take: 10,
    include: { topic: { include: { subject: { select: { name: true } } } } },
  });
  return rows.map((r) => ({
    topicId: r.topicId,
    topicName: r.topic.name,
    subjectName: r.topic.subject.name,
    masteryPercent: r.masteryPercent,
  }));
}

export async function getRecommendations(user: AuthUser) {
  await seedRecommendations(user.id);
  const rows = await prisma.learningRecommendation.findMany({
    where: { userId: user.id, dismissed: false },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: { subject: { select: { name: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    reason: r.reason,
    subjectId: r.subjectId,
    subjectName: r.subject.name,
    topicId: r.topicId ?? undefined,
    difficulty: r.difficulty as QuestionDifficulty,
    estimatedMinutes: r.estimatedMinutes,
    actionType: r.actionType,
    createdAt: r.createdAt.toISOString(),
  }));
}

/** Create recommendations from real weak-topic and quiz data. */
export async function seedRecommendations(userId: string): Promise<void> {
  const weak = await prisma.topicProgress.findMany({
    where: { userId, masteryPercent: { lt: WEAK_MASTERY } },
    orderBy: { masteryPercent: 'asc' },
    take: 5,
  });
  for (const tp of weak) {
    const existing = await prisma.learningRecommendation.findFirst({
      where: { userId, topicId: tp.topicId, dismissed: false, createdAt: { gte: new Date(Date.now() - 86400000) } },
    });
    if (existing) continue;
    const topic = await prisma.topic.findUnique({ where: { id: tp.topicId }, include: { subject: true } });
    if (!topic) continue;
    await prisma.learningRecommendation.create({
      data: {
        userId,
        title: `Revise ${topic.name}`,
        reason: `Your last quiz score on ${topic.name} was ${tp.lastQuizScore ?? tp.masteryPercent}%. Review and re-practice for better mastery.`,
        actionType: tp.masteryPercent < 40 ? 'review' : 'practice',
        subjectId: topic.subjectId,
        topicId: topic.id,
        difficulty: topic.difficulty as QuestionDifficulty,
        estimatedMinutes: 20,
      },
    });
  }
}

/** Called when a quiz underperforms, so recommendations stay fresh (§22). */
export async function refreshRecommendationsForQuiz(userId: string, subjectId: string, failedTopicIds: string[]) {
  for (const topicId of failedTopicIds) {
    const topic = await prisma.topic.findUnique({ where: { id: topicId }, include: { subject: true } });
    if (!topic) continue;
    const existing = await prisma.learningRecommendation.findFirst({
      where: { userId, topicId, dismissed: false, createdAt: { gte: new Date(Date.now() - 86400000) } },
    });
    if (existing) {
      await prisma.learningRecommendation.update({
        where: { id: existing.id },
        data: { title: `Keep practising ${topic.name}`, reason: 'Repeated difficulty on this topic. Spend a short focused session on it.' },
      });
      continue;
    }
    await prisma.learningRecommendation.create({
      data: {
        userId,
        title: `Practise ${topic.name}`,
        reason: 'This topic came up in a recent quiz where answers fell short. A short focused practice will help.',
        actionType: 'quiz',
        subjectId,
        topicId: topic.id,
        difficulty: topic.difficulty as QuestionDifficulty,
        estimatedMinutes: 20,
      },
    });
  }
}

export async function getGamification(user: AuthUser) {
  const [attempts, completed, activities] = await Promise.all([
    prisma.quizAttempt.count({ where: { userId: user.id, submittedAt: { not: null } } }),
    prisma.topicProgress.count({ where: { userId: user.id, isCompleted: true } }),
    prisma.studyActivity.aggregate({ where: { userId: user.id }, _sum: { minutes: true } }),
  ]);

  const xp = (activities._sum.minutes ?? 0) * 1 + attempts * 15 + completed * 30;
  const level = Math.floor(Math.sqrt(xp / 100)) + 1;

  const achievements = [];
  if (attempts >= 1) achievements.push({ id: 'first_quiz', title: 'First Quiz', description: 'Completed your first quiz', iconKey: 'quiz', unlockedAt: await firstQuizAt(user.id) });
  if (attempts >= 5) achievements.push({ id: 'quiz_run', title: 'Quiz Runner', description: 'Completed 5 quizzes', iconKey: 'bolt', unlockedAt: await firstQuizAt(user.id) });
  if (completed >= 3) achievements.push({ id: 'topic_master', title: 'Topic Master', description: 'Mastered 3 topics', iconKey: 'star', unlockedAt: await firstCompleteAt(user.id) });
  if ((activities._sum.minutes ?? 0) >= 300) achievements.push({ id: 'time_focus', title: 'Focused', description: 'Studied 5 hours', iconKey: 'timer', unlockedAt: await firstQuizAt(user.id) });

  return { xp, level, streakDays: (await getProgressSummary(user)).streakDays, achievements };
}

export async function dismissRecommendation(userId: string, recommendationId: string) {
  const rec = await prisma.learningRecommendation.findUnique({ where: { id: recommendationId } });
  if (!rec) throw new NotFoundError('Recommendation not found');
  if (rec.userId !== userId) throw new NotFoundError('Recommendation not found');
  return prisma.learningRecommendation.update({ where: { id: recommendationId }, data: { dismissed: true } });
}

export async function searchSubjects(term?: string) {
  const where = { isActive: true, ...(term ? { name: { contains: term } } : {}) };
  return prisma.subject.findMany({ where, orderBy: { order: 'asc' } });
}

// ---------------------------------------------------------------------------

function startOfDayOffsets(...daysBack: number[]): Date[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return daysBack.map((d) => {
    const x = new Date(today);
    x.setDate(x.getDate() - d);
    return x;
  });
}

function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function computeStreak(activities: Array<{ happenedAt: Date }>, now: Date, yesterdayStart: Date): number {
  const days = new Set(activities.map((a) => dayKey(a.happenedAt)));
  if (days.size === 0) return 0;

  const anchor = days.has(dayKey(now)) ? new Date() : days.has(dayKey(yesterdayStart)) ? yesterdayStart : null;
  if (!anchor) return 0;

  let streak = 0;
  let cursor = new Date(anchor);
  while (true) {
    if (days.has(dayKey(cursor))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

async function firstQuizAt(userId: string): Promise<string | undefined> {
  const first = await prisma.quizAttempt.findFirst({ where: { userId }, orderBy: { submittedAt: 'asc' }, select: { submittedAt: true } });
  return first?.submittedAt?.toISOString() ?? undefined;
}

async function firstCompleteAt(userId: string): Promise<string | undefined> {
  const first = await prisma.topicProgress.findFirst({ where: { userId, isCompleted: true }, orderBy: { completedAt: 'asc' }, select: { completedAt: true } });
  return first?.completedAt?.toISOString() ?? undefined;
}