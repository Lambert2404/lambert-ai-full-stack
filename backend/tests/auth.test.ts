import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { registerUser } from './helpers.js';

let app: FastifyInstance;

before(async () => {
  app = await buildApp();
});

after(async () => {
  await app.close();
});

test('register returns a session with tokens', async () => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { name: 'New Leon', email: `reg_${Date.now()}@test.local`, password: 'Password123' },
  });
  assert.equal(res.statusCode, 201);
  const data = res.json().data;
  assert.ok(data.accessToken);
  assert.ok(data.refreshToken);
  assert.equal(data.user.role, 'student');
});

test('duplicate email is rejected with ACCOUNT_EXISTS', async () => {
  const u = await registerUser(app, 'dup');
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { name: 'Other', email: u.email, password: 'Password123' },
  });
  assert.equal(res.statusCode, 409);
  assert.equal(res.json().error?.code, 'ACCOUNT_EXISTS');
});

test('login with wrong password returns 401 INVALID_CREDENTIALS', async () => {
  const u = await registerUser(app, 'badpw');
  const res = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email: u.email, password: 'nope-nope' } });
  assert.equal(res.statusCode, 401);
  assert.equal(res.json().error?.code, 'INVALID_CREDENTIALS');
});

test('refresh token exchange issues a new session', async () => {
  const u = await registerUser(app, 'refresh');
  const res = await app.inject({ method: 'POST', url: '/api/auth/refresh', payload: { refreshToken: u.refreshToken } });
  assert.equal(res.statusCode, 200);
  const data = res.json().data;
  assert.ok(data.accessToken);
  assert.ok(data.refreshToken);
});

test('revoked refresh token is rejected', async () => {
  const u = await registerUser(app, 'revoked');
  await app.inject({ method: 'POST', url: '/api/auth/logout', headers: { authorization: `Bearer ${u.token}` }, payload: { refreshToken: u.refreshToken } });
  const res = await app.inject({ method: 'POST', url: '/api/auth/refresh', payload: { refreshToken: u.refreshToken } });
  assert.equal(res.statusCode, 401);
  assert.equal(res.json().error?.code, 'INVALID_REFRESH_TOKEN');
});

test('protected route requires a bearer token', async () => {
  const res = await app.inject({ method: 'GET', url: '/api/users/me' });
  assert.equal(res.statusCode, 401);
  assert.equal(res.json().error?.code, 'MISSING_TOKEN');
});

test('me returns the authenticated user', async () => {
  const u = await registerUser(app, 'me');
  const res = await app.inject({ method: 'GET', url: '/api/users/me', headers: { authorization: `Bearer ${u.token}` } });
  assert.equal(res.statusCode, 200);
  assert.equal(res.json().data.email, u.email);
});

test('teachers are forbidden from admin endpoints', async () => {
  const u = await registerUser(app, 'teacher');
  const loginRes = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email: 'admin@lambertai.com', password: 'Admin@12345' } });
  const adminToken = loginRes.json().data.accessToken;
  assert.ok(adminToken);
  const ok = await app.inject({ method: 'GET', url: '/api/admin/metrics', headers: { authorization: `Bearer ${adminToken}` } });
  assert.equal(ok.statusCode, 200);
  assert.equal(typeof ok.json().data.students, 'number');
  const forbidden = await app.inject({ method: 'GET', url: '/api/admin/metrics', headers: { authorization: `Bearer ${u.token}` } });
  assert.equal(forbidden.statusCode, 403);
  assert.equal(forbidden.json().error?.code, 'FORBIDDEN');
});