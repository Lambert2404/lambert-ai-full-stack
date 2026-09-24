import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../lib/auth.js';
import { NotFoundError, ValidationError, ForbiddenError } from '../lib/errors.js';
import { replyOk } from '../lib/envelope.js';
import { generateQuiz, startAttempt, submitAttempt } from '../services/quizzes.js';

const generateSchema = z.object({
  subjectId: z.string().min(1),
  topicId: z.string().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  questionCount: z.number().int().min(2).max(30).default(10),
  questionType: z.enum(['mcq', 'true_false', 'short_answer', 'mixed']).default('mixed'),
  language: z.enum(['en', 'sw']).default('en'),
  timed: z.boolean().default(false),
  durationMinutes: z.number().int().min(1).max(240).optional(),
});

const submitSchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.string(),
        selectedOptionId: z.string().optional(),
        textAnswer: z.string().optional(),
      })
    )
    .max(60),
});

function quizDto(q: {
  id: string;
  title: string;
  subjectId: string;
  topicId: string | null;
  difficulty: string;
  language: string;
  timed: boolean;
  durationMinutes: number | null;
  questionCount: number;
  createdAt: Date;
  generatedBy: string;
}) {
  return {
    id: q.id,
    title: q.title,
    subjectId: q.subjectId,
    topicId: q.topicId ?? undefined,
    difficulty: q.difficulty,
    language: q.language,
    timed: q.timed,
    durationMinutes: q.durationMinutes ?? undefined,
    questionCount: q.questionCount,
    generatedBy: q.generatedBy,
    createdAt: q.createdAt.toISOString(),
  };
}

export async function quizRoutes(app: FastifyInstance) {
  app.post('/api/quizzes/generate', { preHandler: authenticate, config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (request, reply) => {
    const parsed = generateSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError('Invalid quiz generation request', parsed.error.flatten().fieldErrors);
    const quiz = await generateQuiz({ user: request.user!, ...parsed.data });
    return reply.status(201).send({ success: true, data: quizDto(quiz), message: null, error: null });
  });

  app.get('/api/quizzes', { preHandler: authenticate }, async (request, reply) => {
    const quizzes = await prisma.quiz.findMany({
      where: {
        OR: [{ isPublic: true }, { createdBy: request.user!.id }],
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return replyOk(reply, quizzes.map(quizDto));
  });

  app.get('/api/quizzes/:id', { preHandler: authenticate }, async (request, reply) => {
    const quiz = await accessibleQuiz(request.user!.id, (request.params as { id: string }).id);
    return replyOk(reply, quizDto(quiz));
  });

  app.get('/api/quizzes/:id/questions', { preHandler: authenticate }, async (request, reply) => {
    const quiz = await accessibleQuiz(request.user!.id, (request.params as { id: string }).id);
    const questions = await prisma.quizQuestion.findMany({
      where: { quizId: quiz.id },
      orderBy: { order: 'asc' },
    });
    return replyOk(
      reply,
      questions.map((q) => ({
        id: q.id,
        prompt: q.prompt,
        type: q.type,
        options: (q.options as Array<{ id: string; text: string }>) ?? undefined,
        correctOptionId: q.correctOptionId ?? undefined,
        difficulty: q.difficulty,
        topicId: q.topicId ?? undefined,
      }))
    );
  });

  app.post('/api/quizzes/:id/attempts', { preHandler: authenticate }, async (request, reply) => {
    const attempt = await startAttempt(request.user!, (request.params as { id: string }).id);
    return reply.status(201).send({ success: true, data: attempt, message: null, error: null });
  });

  app.patch('/api/quiz-attempts/:id', { preHandler: authenticate, config: { rateLimit: { max: 30, timeWindow: '1 minute' } } }, async (request, reply) => {
    const parsed = submitSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError('Invalid answers payload');
    const attempt = await submitAttempt(request.user!, (request.params as { id: string }).id, parsed.data.answers);
    return replyOk(reply, attempt);
  });

  app.get('/api/quiz-attempts/:id', { preHandler: authenticate }, async (request, reply) => {
    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: (request.params as { id: string }).id },
      include: { answerDetails: true },
    });
    if (!attempt) throw new NotFoundError('Attempt not found');
    if (request.user!.role !== 'admin' && attempt.userId !== request.user!.id) throw new ForbiddenError('Access denied');
    return replyOk(reply, attempt);
  });

  app.get('/api/quiz-attempts', { preHandler: authenticate }, async (request, reply) => {
    const attempts = await prisma.quizAttempt.findMany({
      where: { userId: request.user!.id },
      orderBy: { submittedAt: 'desc' },
      take: 100,
      include: { quiz: { select: { title: true, subjectId: true } } },
    });
    return replyOk(
      reply,
      attempts.map((a) => ({
        ...a,
        quizTitle: a.quiz.title,
        subjectId: a.quiz.subjectId,
        quiz: undefined,
        startedAt: a.startedAt,
        submittedAt: a.submittedAt,
      }))
    );
  });
}

async function accessibleQuiz(userId: string, quizId: string) {
  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
  if (!quiz) throw new NotFoundError('Quiz not found');
  if (quiz.isPublic === false && quiz.createdBy !== userId) throw new ForbiddenError('This quiz is private.');
  return quiz;
}