import { prisma } from '../lib/prisma.js';
import { ForbiddenError, NotFoundError, ValidationError, AiUnavailableError } from '../lib/errors.js';
import { systemPromptFor, wrapUntrusted } from '../lib/aiModes.js';
import { routeGenerate } from '../providers/router.js';
import { parseJsonFromResponse } from './documents.js';
import { createNotification } from './notify.js';
import { clamp } from '../lib/util.js';
import type { AuthUser } from '../lib/auth.js';
import type { QuestionDifficulty } from '../types.js';

export type QuizQuestionType = 'mcq' | 'true_false' | 'short_answer' | 'calculation' | 'problem_solving';

export interface GenerateQuizInput {
  user: AuthUser;
  subjectId: string;
  topicId?: string;
  difficulty: QuestionDifficulty;
  questionCount: number;
  questionType: 'mcq' | 'true_false' | 'short_answer' | 'mixed';
  language: 'en' | 'sw';
  timed: boolean;
  durationMinutes?: number;
}

interface ParsedQuestion {
  prompt: string;
  type: string;
  options?: Array<{ id: string; text: string }>;
  correctOptionId?: string;
  answerText?: string;
  explanation?: string;
  difficulty?: string;
  topicId?: string | null;
}

export async function generateQuiz(input: GenerateQuizInput) {
  const subject = await prisma.subject.findUnique({ where: { id: input.subjectId } });
  if (!subject) throw new NotFoundError('Subject not found');

  const topics = await prisma.topic.findMany({
    where: { subjectId: input.subjectId, isActive: true },
    orderBy: { order: 'asc' },
  });
  if (input.topicId && !topics.some((t) => t.id === input.topicId)) {
    throw new ValidationError('Topic does not belong to this subject');
  }

  const count = clamp(input.questionCount, 2, 30);
  const types =
    input.questionType === 'mixed' ? ['mcq', 'true_false', 'short_answer'] : [input.questionType];
  const lang = input.language === 'sw' ? 'Swahili' : 'English';

  const prompt = `
Generate exactly ${count} quiz questions for a study platform.
Subject: ${subject.name}
Topic scope: ${topics.map((t) => `id=${t.id} name="${t.name}"`).join('; ') || 'No specific topics'}
Difficulty: ${input.difficulty}
Question types to include: ${types.join(', ')}
Language for all question text: ${lang}

Return strict JSON with ONLY this shape (no markdown):
{
  "questions": [
    {
      "prompt": "question text",
      "type": "mcq" | "true_false" | "short_answer" | "calculation" | "problem_solving",
      "difficulty": "easy" | "medium" | "hard",
      "options": [ { "id": "a", "text": "option text" } ],
      "correctOptionId": "a",
      "answerText": "concise expected answer for short_answer/calculation",
      "explanation": "brief teaching explanation",
      "topicId": "<matching topic id from the list above or null>"
    }
  ]
}
Rules:
- mcq questions must have exactly 4 options exactly one correctOptionId.
- true_false questions have options [{"id":"true","text":"True"},{"id":"false","text":"False"}] and correctOptionId set.
- short_answer / calculation have answerText (short, precise, with units for calculations) and no options.
- Questions must be answerable from the subject/topic and match the requested difficulty.
`;

  let parsed: { questions?: ParsedQuestion[] };
  try {
    const result = await routeGenerate({
      task: 'quiz_generation',
      providerCode: 'lambert_auto',
      userId: input.user.id,
      system: systemPromptFor('revision') + '\n\n' + prompt,
      messages: [{ role: 'user', content: wrapUntrusted('Generate the quiz JSON now.') }],
      temperature: 0.3,
    });
    parsed = parseJsonFromResponse(result.response) as { questions?: ParsedQuestion[] };
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    throw err instanceof AiUnavailableError
      ? err
      : new AiUnavailableError('Quiz generation failed because no AI provider is available.');
  }

  const questions = (parsed.questions ?? []).slice(0, count);
  if (questions.length === 0) {
    throw new ValidationError('The AI produced no usable questions. Please try again.');
  }

  const topicIds = new Set(topics.map((t) => t.id));
  const quiz = await prisma.quiz.create({
    data: {
      title: `${subject.name} ${input.topicId ? 'Topic' : ''} quiz`,
      subjectId: input.subjectId,
      topicId: input.topicId,
      difficulty: input.difficulty,
      language: input.language,
      timed: input.timed,
      durationMinutes: input.durationMinutes,
      questionCount: questions.length,
      generatedBy: 'ai',
      createdBy: input.user.id,
    },
  });

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i]!;
    const type = normalizeType(q.type);
    const topicId = q.topicId && topicIds.has(q.topicId) ? q.topicId : input.topicId ?? null;
    const options = type === 'mcq' || type === 'true_false' ? sanitizeOptions(type, q.options) : undefined;
    const correctOptionId =
      type === 'mcq' || type === 'true_false' ? resolveCorrectOption(type, q.correctOptionId, options ?? []) : null;
    const answerText =
      type === 'short_answer' || type === 'calculation' || type === 'problem_solving' ? q.answerText ?? null : null;

    await prisma.quizQuestion.create({
      data: {
        quizId: quiz.id,
        prompt: q.prompt,
        type,
        options: (options ?? undefined) as never,
        correctOptionId,
        correctAnswer: answerText ? ({ text: answerText } as never) : undefined,
        explanation: q.explanation,
        difficulty: q.difficulty === 'hard' || q.difficulty === 'easy' ? q.difficulty : 'medium',
        topicId,
        order: i,
      },
    });
  }

  await prisma.studyActivity.create({
    data: { userId: input.user.id, subjectId: input.subjectId, topicId: input.topicId, type: 'quiz' },
  });

  return quiz;
}

function normalizeType(raw: string): QuizQuestionType {
  const normalized = raw?.toLowerCase().replace(/[\s_-]+/g, '_');
  switch (normalized) {
    case 'mcq':
    case 'multiple_choice':
      return 'mcq';
    case 'true_false':
      return 'true_false';
    case 'short_answer':
      return 'short_answer';
    case 'calculation':
      return 'calculation';
    case 'problem_solving':
      return 'problem_solving';
    default:
      return 'short_answer';
  }
}

function sanitizeOptions(type: QuizQuestionType, raw?: Array<{ id?: string; text?: string }> | null) {
  if (type === 'true_false') {
    return [
      { id: 'true', text: 'True' },
      { id: 'false', text: 'False' },
    ];
  }
  const options = Array.isArray(raw) ? raw.slice(0, 4) : [];
  if (options.length < 2) {
    throw new ValidationError('The AI returned MCQs without enough options.');
  }
  return options.map((o, i) => ({ id: o.id ?? String(i), text: o.text ?? '' }));
}

function resolveCorrectOption(type: QuizQuestionType, raw: string | undefined, options: Array<{ id: string; text: string }>) {
  const ids = new Set(options.map((o) => o.id));
  if (raw && ids.has(raw)) return raw;
  throw new ValidationError('The AI returned MCQs with an invalid correct option id.');
}

// ---------------------------------------------------------------------------
// Attempts & grading
// ---------------------------------------------------------------------------

export interface AttemptAnswerInput {
  questionId: string;
  selectedOptionId?: string;
  textAnswer?: string;
}

export async function startAttempt(user: AuthUser, quizId: string) {
  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
  if (!quiz) throw new NotFoundError('Quiz not found');
  if (quiz.isPublic === false && quiz.createdBy !== user.id && user.role !== 'admin') {
    throw new ForbiddenError('This quiz is private.');
  }
  return prisma.quizAttempt.create({
    data: { quizId, userId: user.id },
  });
}

export async function submitAttempt(user: AuthUser, attemptId: string, answers: AttemptAnswerInput[]) {
  const attempt = await prisma.quizAttempt.findUnique({
    where: { id: attemptId },
    include: { quiz: { include: { questions: { orderBy: { order: 'asc' } } } } },
  });
  if (!attempt) throw new NotFoundError('Attempt not found');
  if (user.role !== 'admin' && attempt.userId !== user.id) {
    throw new ForbiddenError('You do not have access to this attempt');
  }
  if (attempt.submittedAt) throw new ValidationError('This attempt has already been submitted');

  const now = new Date();
  const timeSpentSeconds = Math.max(0, Math.round((now.getTime() - attempt.startedAt.getTime()) / 1000));

  const questions = attempt.quiz.questions;
  const byId = new Map(questions.map((q) => [q.id, q]));
  const byTopic = new Map<string, { topicId: string; topicName: string; total: number; correct: number }>();
  const graded: Array<{ attemptId: string; questionId: string; selectedOptionId?: string; textAnswer?: string; isCorrect: boolean }> = [];
  const snapshot: AttemptAnswerInput[] = [];
  let correct = 0;

  for (const answer of answers) {
    const question = byId.get(answer.questionId);
    if (!question) throw new ValidationError(`Unknown question id: ${answer.questionId}`);
    snapshot.push(answer);
    const isCorrect = gradeAnswer(question, answer);
    if (isCorrect) correct++;
    graded.push({
      attemptId: attempt.id,
      questionId: question.id,
      selectedOptionId: answer.selectedOptionId,
      textAnswer: answer.textAnswer,
      isCorrect,
    });

    const topicKey = question.topicId ?? 'untracked';
    const bucket = byTopic.get(topicKey) ?? { topicId: topicKey, topicName: question.topicId ? (await prisma.topic.findUnique({ where: { id: question.topicId } }))?.name ?? topicKey : 'General', total: 0, correct: 0 };
    bucket.total++;
    if (isCorrect) bucket.correct++;
    byTopic.set(topicKey, bucket);
  }

  if (answers.length !== questions.length) {
    throw new ValidationError(`Please answer all ${questions.length} questions.`);
  }

  const scorePercent = questions.length ? Math.round((correct / questions.length) * 1000) / 10 : 0;
  const topicBreakdown = [...byTopic.values()].map((t) => ({
    topicId: t.topicId,
    topicName: t.topicName,
    correctPercent: t.total ? Math.round((t.correct / t.total) * 100) : 0,
  }));

  await prisma.$transaction([
    prisma.quizAttempt.update({
      where: { id: attempt.id },
      data: {
        submittedAt: now,
        scorePercent,
        correctCount: correct,
        incorrectCount: questions.length - correct,
        timeSpentSeconds,
        answers: { questions: snapshot } as never,
        topicBreakdown: topicBreakdown as never,
      },
    }),
    prisma.quizAnswer.createMany({ data: graded as never }),
  ]);

  // Learning engine updates (§22)
  for (const q of questions) {
    if (!q.topicId) continue;
    await updateTopicProgress(attempt.userId, q.topicId, scorePercent);
  }

  await prisma.studyActivity.create({
    data: {
      userId: attempt.userId,
      subjectId: attempt.quiz.subjectId,
      topicId: attempt.quiz.topicId ?? undefined,
      type: 'quiz',
      minutes: Math.round(timeSpentSeconds / 60),
      quizAttemptId: attempt.id,
    },
  });

  await createNotification(
    attempt.userId,
    'quiz_result',
    'Quiz complete',
    `You scored ${scorePercent}% on "${attempt.quiz.title}".`,
    { quizId: attempt.quiz.id, attemptId: attempt.id, scorePercent }
  );

  if (scorePercent < 60) {
    const { refreshRecommendationsForQuiz } = await import('./progress.js');
    await refreshRecommendationsForQuiz(attempt.userId, attempt.quiz.subjectId, questions.filter((q) => q.topicId).map((q) => q.topicId!));
  }

  return prisma.quizAttempt.findUnique({
    where: { id: attempt.id },
    include: { answerDetails: true },
  });
}

function gradeAnswer(question: { type: string; correctOptionId: string | null; correctAnswer: unknown; id: string }, answer: AttemptAnswerInput): boolean {
  const type = question.type;
  if (type === 'short_answer' || type === 'calculation' || type === 'problem_solving') {
    const expectedObj = question.correctAnswer as { text?: string } | null;
    const expected = (expectedObj?.text ?? '').trim().toLowerCase();
    const actual = (answer.textAnswer ?? '').trim().toLowerCase();
    if (!expected) return false;
    const collapsed = (s: string) => s.replace(/\s+/g, ' ');
    return collapsed(actual) === collapsed(expected);
  }
  // mcq / true_false
  if (!question.correctOptionId || !answer.selectedOptionId) return false;
  return question.correctOptionId === answer.selectedOptionId;
}

async function updateTopicProgress(userId: string, topicId: string, scorePercent: number) {
  const existing = await prisma.topicProgress.findUnique({
    where: { userId_topicId: { userId, topicId } },
  });
  const mastery = existing
    ? Math.round((existing.masteryPercent * 0.3 + scorePercent * 0.7) * 10) / 10
    : scorePercent;
  const attempts = (existing?.attempts ?? 0) + 1;
  const isCompleted = mastery >= 80 && attempts >= 2;
  await prisma.topicProgress.upsert({
    where: { userId_topicId: { userId, topicId } },
    create: { userId, topicId, subjectId: (await prisma.topic.findUnique({ where: { id: topicId } }))?.subjectId ?? '', masteryPercent: mastery, attempts, isCompleted, completedAt: isCompleted ? new Date() : null },
    update: { masteryPercent: mastery, attempts, isCompleted, completedAt: isCompleted && !existing?.isCompleted ? new Date() : existing?.isCompleted ? existing.completedAt : null, lastQuizScore: scorePercent },
  });
}