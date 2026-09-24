import type { FastifyInstance } from 'fastify';
import assert from 'node:assert/strict';

export async function registerUser(
  app: FastifyInstance,
  tag: string
): Promise<{ email: string; password: string; token: string; refreshToken: string; userId: string }> {
  const email = `${tag}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@test.local`;
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { name: 'Test User', email, password: 'Password123' },
  });
  assert.equal(res.statusCode, 201, `register failed: ${res.body}`);
  const data = res.json().data;
  return {
    email,
    password: 'Password123',
    token: data.accessToken,
    refreshToken: data.refreshToken,
    userId: data.user.id as string,
  };
}

export async function login(
  app: FastifyInstance,
  email: string,
  password: string
): Promise<{ token: string; refreshToken: string }> {
  const res = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email, password } });
  assert.equal(res.statusCode, 200, `login failed: ${res.body}`);
  return { token: res.json().data.accessToken, refreshToken: res.json().data.refreshToken };
}

export function auth(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}` };
}

function injectJson(app: FastifyInstance, url: string, token?: string, method: 'GET' | 'PATCH' | 'DELETE' = 'GET') {
  return app.inject({ method, url, headers: token ? auth(token) : {} });
}

export async function getJson<T>(app: FastifyInstance, url: string, token: string): Promise<{ status: number; data: T }> {
  const res = await injectJson(app, url, token);
  return { status: res.statusCode, data: res.json().data as T };
}