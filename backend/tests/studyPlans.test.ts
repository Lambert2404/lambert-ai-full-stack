import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { registerUser, getJson } from './helpers.js';
import { prisma } from '../src/lib/prisma.js';

let app: FastifyInstance;
let owner: Awaited<ReturnType<typeof registerUser>>;
let other: Awaited<ReturnType<typeof registerUser>>;

before(async () => {
  app = await buildApp();
  owner = await registerUser(app, 'planOwner');
  other = await registerUser(app, 'planOther');
});

after(async () => {
  await prisma.studyPlan.deleteMany({ where: { userId: { in: [owner.userId, other.userId] } } });
  await app.close();
});

test('manual plan creation with sessions', async () => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/study-plans',
    headers: { authorization: `Bearer ${owner.token}` },
    payload: {
      title: 'Exam crunch',
      sessions: [
        { title: 'Algebra review', date: '2026-10-01', startTime: '09:00', durationMinutes: 45 },
        { title: 'Geometry drill', date: '2026-10-02', startTime: '14:00', durationMinutes: 60 },
      ],
    },
  });
  assert.equal(res.statusCode, 201, res.body);
  const plan = res.json().data;
  assert.equal(plan.createdBy, 'user');
  assert.equal(plan.sessions.length, 2);
  assert.equal(plan.isActive, true);
});

test('active plan is returned and is the most recent one', async () => {
  const { data } = await getJson<{ id: string; sessions: unknown[] } | null>(app, '/api/study-plans/active', owner.token);
  assert.ok(data);
  assert.equal(data.isActive, true);
  assert.ok(Array.isArray(data.sessions));
});

test('patch a session to completed', async () => {
  const { data: plan } = await getJson<{ sessions: Array<{ id: string }> }>(app, '/api/study-plans/active', owner.token);
  const sessionId = plan.sessions[0]!.id;
  const res = await app.inject({
    method: 'PATCH',
    url: `/api/study-sessions/${sessionId}`,
    headers: { authorization: `Bearer ${owner.token}` },
    payload: { status: 'completed' },
  });
  assert.equal(res.statusCode, 200);
  assert.equal(res.json().data.status, 'completed');
  assert.ok(res.json().data.completedAt);

  const activity = await prisma.studyActivity.findFirst({ where: { userId: owner.userId, type: 'study' } });
  assert.ok(activity, 'completing a session should record study activity');
});

test('generate a plan programmatically and supersede the previous active plan', async () => {
  const previous = (await getJson<{ id: string } | null>(app, '/api/study-plans/active', owner.token)).data;
  const res = await app.inject({
    method: 'POST',
    url: '/api/study-plans/generate',
    headers: { authorization: `Bearer ${owner.token}` },
    payload: { examDate: '2026-11-30', weeklyHoursTarget: 8 },
  });
  assert.equal(res.statusCode, 201, res.body);
  const plan = res.json().data;
  assert.equal(plan.createdBy, 'ai');
  assert.ok(plan.sessions.length > 0);
  assert.notEqual(plan.id, previous?.id);

  const active = (await getJson<{ id: string } | null>(app, '/api/study-plans/active', owner.token)).data;
  assert.equal(active?.id, plan.id);
});

test('another user cannot read the plan (403)', async () => {
  const active = (await getJson<{ id: string } | null>(app, '/api/study-plans/active', owner.token)).data;
  assert.ok(active);
  const res = await app.inject({ method: 'GET', url: `/api/study-plans/${active.id}`, headers: { authorization: `Bearer ${other.token}` } });
  assert.equal(res.statusCode, 403);
  assert.equal(res.json().error?.code, 'FORBIDDEN');
});

test('another user cannot patch a session (403)', async () => {
  const active = (await getJson<{ id: string } | null>(app, '/api/study-plans/active', owner.token)).data;
  assert.ok(active);
  const res = await app.inject({
    method: 'PATCH',
    url: `/api/study-sessions/${active.sessions[0]!.id}`,
    headers: { authorization: `Bearer ${other.token}` },
    payload: { status: 'skipped' },
  });
  assert.equal(res.statusCode, 403);
});

test('delete a session then delete the plan', async () => {
  const active = (await getJson<{ id: string; sessions: unknown[] } | null>(app, '/api/study-plans/active', owner.token)).data;
  assert.ok(active);
  const before = active.sessions.length;
  const sessionId = (active.sessions[0] as { id: string }).id;

  const del = await app.inject({ method: 'DELETE', url: `/api/study-sessions/${sessionId}`, headers: { authorization: `Bearer ${owner.token}` } });
  assert.equal(del.statusCode, 200);
  const afterDelete = (await getJson<{ sessions: unknown[] }>(app, `/api/study-plans/${active.id}`, owner.token)).data;
  assert.equal(afterDelete.sessions.length, before - 1);

  const delPlan = await app.inject({ method: 'DELETE', url: `/api/study-plans/${active.id}`, headers: { authorization: `Bearer ${owner.token}` } });
  assert.equal(delPlan.statusCode, 200);
  assert.equal(delPlan.json().data, null);
});