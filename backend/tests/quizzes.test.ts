import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { registerUser } from './helpers.js';
import { prisma } from '../src/lib/prisma.js';

let app: FastifyInstance;
let user: Awaited<ReturnType<typeof registerUser>>;
let quizId = '';
let questionIds: string[] = [];

before(async () => {
  app = await buildApp();
  user = await registerUser(app, 'quiz');

  const quiz = await prisma.quiz.create({
    data: {
      title: 'Grading Test Quiz',
      subjectId: 'sub_math',
      difficulty: 'easy',
      language: 'en',
      timed: false,
      questionCount: 3,
      generatedBy: 'test',
      createdBy: user.userId,
      isPublic: true,
    },
  });
  quizId = quiz.id;

  await prisma.quizQuestion.createMany({
    data: [
      {
        quizId,
        prompt: 'What is 2 + 2?',
        type: 'mcq',
        order: 0,
        options: [
          { id: 'a', text: '3' },
          { id: 'b', text: '4' },
        ],
        correctOptionId: 'b',
        difficulty: 'easy',
      },
      {
        quizId,
        prompt: 'Water freezes at 0 degrees.',
        type: 'true_false',
        order: 1,
        options: [
          { id: 'true', text: 'True' },
          { id: 'false', text: 'False' },
        ],
        correctOptionId: 'true',
        difficulty: 'easy',
      },
      {
        quizId,
        prompt: 'State the chemical symbol for gold.',
        type: 'short_answer',
        order: 2,
        correctAnswer: { text: 'Au' },
        difficulty: 'easy',
      },
    ],
  });

  const rows = await prisma.quizQuestion.findMany({ where: { quizId }, orderBy: { order: 'asc' } });
  questionIds = rows.map((r) => r.id);
});

after(async () => {
  await prisma.quizAttempt.deleteMany({ where: { quizId } });
  await prisma.quizQuestion.deleteMany({ where: { quizId } });
  await prisma.quiz.delete({ where: { id: quizId } });
  await app.close();
});

test('quiz questions expose the correct option ids', async () => {
  const res = await app.inject({ method: 'GET', url: `/api/quizzes/${quizId}/questions`, headers: { authorization: `Bearer ${user.token}` } });
  assert.equal(res.statusCode, 200);
  const questions = res.json().data;
  assert.equal(questions.length, 3);
  assert.equal(questions[0].correctOptionId, 'b');
  assert.equal(questions[1].correctOptionId, 'true');
});

test('start an attempt and submit all-correct answers -> 100%', async () => {
  const start = await app.inject({ method: 'POST', url: `/api/quizzes/${quizId}/attempts`, headers: { authorization: `Bearer ${user.token}` } });
  assert.equal(start.statusCode, 201);
  const attemptId = start.json().data.id as string;

  const submit = await app.inject({
    method: 'PATCH',
    url: `/api/quiz-attempts/${attemptId}`,
    headers: { authorization: `Bearer ${user.token}` },
    payload: {
      answers: [
        { questionId: questionIds[0], selectedOptionId: 'b' },
        { questionId: questionIds[1], selectedOptionId: 'true' },
        { questionId: questionIds[2], textAnswer: 'Au' },
      ],
    },
  });
  assert.equal(submit.statusCode, 200, submit.body);
  const data = submit.json().data;
  assert.equal(data.scorePercent, 100);
  assert.equal(data.correctCount, 3);
  assert.equal(data.incorrectCount, 0);
  assert.ok(data.submittedAt);
  assert.equal(data.answerDetails.length, 3);

  const grade = await app.inject({ method: 'GET', url: `/api/quiz-attempts/${attemptId}`, headers: { authorization: `Bearer ${user.token}` } });
  assert.equal(grade.statusCode, 200);
  assert.equal(grade.json().data.answerDetails.every((a: { isCorrect: boolean }) => a.isCorrect), true);
});

test('submitting the same attempt twice is rejected', async () => {
  const start = await app.inject({ method: 'POST', url: `/api/quizzes/${quizId}/attempts`, headers: { authorization: `Bearer ${user.token}` } });
  const attemptId = start.json().data.id as string;
  const answers = {
    answers: [
      { questionId: questionIds[0], selectedOptionId: 'a' },
      { questionId: questionIds[1], selectedOptionId: 'false' },
      { questionId: questionIds[2], textAnswer: 'wrong' },
    ],
  };
  const first = await app.inject({ method: 'PATCH', url: `/api/quiz-attempts/${attemptId}`, headers: { authorization: `Bearer ${user.token}` }, payload: answers });
  assert.equal(first.statusCode, 200);
  const second = await app.inject({ method: 'PATCH', url: `/api/quiz-attempts/${attemptId}`, headers: { authorization: `Bearer ${user.token}` }, payload: answers });
  assert.equal(second.statusCode, 400);
  assert.equal(second.json().error?.code, 'VALIDATION_ERROR');
});

test('partial answers are rejected', async () => {
  const start = await app.inject({ method: 'POST', url: `/api/quizzes/${quizId}/attempts`, headers: { authorization: `Bearer ${user.token}` } });
  const attemptId = start.json().data.id as string;
  const res = await app.inject({
    method: 'PATCH',
    url: `/api/quiz-attempts/${attemptId}`,
    headers: { authorization: `Bearer ${user.token}` },
    payload: { answers: [{ questionId: questionIds[0], selectedOptionId: 'b' }] },
  });
  assert.equal(res.statusCode, 400);
});

test('another user cannot read the attempt (403)', async () => {
  const start = await app.inject({ method: 'POST', url: `/api/quizzes/${quizId}/attempts`, headers: { authorization: `Bearer ${user.token}` } });
  const attemptId = start.json().data.id as string;
  const other = await registerUser(app, 'quizB');
  const res = await app.inject({ method: 'GET', url: `/api/quiz-attempts/${attemptId}`, headers: { authorization: `Bearer ${other.token}` } });
  assert.equal(res.statusCode, 403);
  assert.equal(res.json().error?.code, 'FORBIDDEN');
});