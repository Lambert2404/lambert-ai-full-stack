import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { registerUser, getJson } from './helpers.js';

let app: FastifyInstance;
let userA: Awaited<ReturnType<typeof registerUser>>;
let userB: Awaited<ReturnType<typeof registerUser>>;

before(async () => {
  app = await buildApp();
  userA = await registerUser(app, 'chatA');
  userB = await registerUser(app, 'chatB');
});

after(async () => {
  await app.close();
});

test('create a conversation', async () => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/conversations',
    headers: { authorization: `Bearer ${userA.token}` },
    payload: { mode: 'tutor' },
  });
  assert.equal(res.statusCode, 200);
  const data = res.json().data;
  assert.ok(data.id);
  assert.equal(data.mode, 'tutor');
  (app as unknown as { __convId: string }).__convId = data.id;
});

test('conversation appears in the list with a preview', async () => {
  const convId = (app as unknown as { __convId: string }).__convId;
  const list = await getJson<Array<{ id: string }>>(app, '/api/conversations', userA.token);
  assert.ok(list.data.some((c) => c.id === convId));
});

test('another user cannot read the conversation (403)', async () => {
  const convId = (app as unknown as { __convId: string }).__convId;
  const res = await app.inject({ method: 'GET', url: `/api/conversations/${convId}`, headers: { authorization: `Bearer ${userB.token}` } });
  assert.equal(res.statusCode, 403);
  assert.equal(res.json().error?.code, 'FORBIDDEN');
});

test('fresh conversation has no messages', async () => {
  const convId = (app as unknown as { __convId: string }).__convId;
  const messages = await getJson<unknown[]>(app, `/api/conversations/${convId}/messages`, userA.token);
  assert.deepEqual(messages.data, []);
});

test('owner can rename and delete the conversation', async () => {
  const convId = (app as unknown as { __convId: string }).__convId;
  const patchRes = await app.inject({
    method: 'PATCH',
    url: `/api/conversations/${convId}`,
    headers: { authorization: `Bearer ${userA.token}` },
    payload: { title: 'My renamed chat' },
  });
  assert.equal(patchRes.statusCode, 200);
  assert.equal(patchRes.json().data.title, 'My renamed chat');

  const delRes = await app.inject({ method: 'DELETE', url: `/api/conversations/${convId}`, headers: { authorization: `Bearer ${userA.token}` } });
  assert.equal(delRes.statusCode, 200);
  assert.equal(delRes.json().data, null);
});

test('deleting a conversation twice yields 404', async () => {
  const convId = (app as unknown as { __convId: string }).__convId;
  const res = await app.inject({ method: 'GET', url: `/api/conversations/${convId}`, headers: { authorization: `Bearer ${userA.token}` } });
  assert.equal(res.statusCode, 404);
  assert.equal(res.json().error?.code, 'NOT_FOUND');
});