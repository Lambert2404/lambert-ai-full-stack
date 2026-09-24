import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import {
  hashPassword,
  verifyPassword,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
  authenticate,
} from '../lib/auth.js';
import { AuthError, ConflictError, ValidationError } from '../lib/errors.js';
import { replyOk } from '../lib/envelope.js';
import { auditLog } from '../lib/audit.js';
import { config } from '../config.js';
import { createNotification } from '../services/notify.js';
import { randomToken } from '../lib/util.js';

const registerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(128),
  preferredLanguage: z.enum(['en', 'sw']).default('en'),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export function publicUser(u: { id: string; name: string; email: string; role: string; avatarUrl: string | null; createdAt: Date }) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    avatarUrl: u.avatarUrl ?? undefined,
    createdAt: u.createdAt.toISOString(),
  };
}

async function issueSession(reply: FastifyReply, userId: string, email: string, name: string, role: string) {
  const authUser = { id: userId, email, name, role: role as 'student' | 'teacher' | 'admin' };
  const accessToken = signAccessToken(authUser);
  const refreshToken = signRefreshToken(userId);
  const expiresAt = jwtExpiry(config.jwt.accessTtl);

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + ttlMs(config.jwt.refreshTtl)),
      ip: reply.request.ip,
      userAgent: typeof reply.request.headers['user-agent'] === 'string' ? reply.request.headers['user-agent'] : undefined,
    },
  });

  return {
    user: { id: userId, name, email, role, createdAt: new Date().toISOString() },
    accessToken,
    refreshToken,
    expiresAt,
  };
}

function jwtExpiry(ttl: string): string {
  return new Date(Date.now() + ttlMs(ttl)).toISOString();
}

function ttlMs(ttl: string): number {
  const match = /^(\d+)([smhd])$/.exec(ttl);
  if (!match) return 15 * 60 * 1000;
  const n = Number(match[1]);
  switch (match[2]) {
    case 's':
      return n * 1000;
    case 'm':
      return n * 60 * 1000;
    case 'h':
      return n * 60 * 60 * 1000;
    case 'd':
      return n * 24 * 60 * 60 * 1000;
    default:
      return 15 * 60 * 1000;
  }
}

export async function authRoutes(app: FastifyInstance) {
  app.post(
    '/api/auth/register',
    {
      config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
      schema: { tags: ['Authentication'], body: { type: 'object', properties: { name: { type: 'string' }, email: { type: 'string' }, password: { type: 'string' }, preferredLanguage: { type: 'string' } } } },
    },
    async (request, reply) => {
      const parsed = registerSchema.safeParse(request.body);
      if (!parsed.success) throw new ValidationError('Invalid registration details', { issues: parsed.error.flatten().fieldErrors });

      const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
      if (existing) throw new ConflictError('ACCOUNT_EXISTS', 'An account with this email already exists.');

      const user = await prisma.user.create({
        data: {
          email: parsed.data.email,
          passwordHash: await hashPassword(parsed.data.password),
          name: parsed.data.name,
          role: 'student',
          profile: { create: { preferredLanguage: parsed.data.preferredLanguage } },
        },
      });

      const session = await issueSession(reply, user.id, user.email, user.name, user.role);
      await auditLog({ request, userId: user.id, role: user.role, action: 'auth.register' });
      return replyOk(reply, session, 'Account created successfully', 201);
    }
  );

  app.post(
    '/api/auth/login',
    {
      config: { rateLimit: { max: 15, timeWindow: '1 minute' } },
      schema: { tags: ['Authentication'], body: { type: 'object', properties: { email: { type: 'string' }, password: { type: 'string' } } } },
    },
    async (request, reply) => {
      const parsed = loginSchema.safeParse(request.body);
      if (!parsed.success) throw new ValidationError('Invalid login details');

      const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
      if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
        throw new AuthError('INVALID_CREDENTIALS', 'Incorrect email or password.');
      }
      if (!user.isActive) throw new AuthError('ACCOUNT_DISABLED', 'This account has been disabled.');

      const session = await issueSession(reply, user.id, user.email, user.name, user.role);
      await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
      await auditLog({ request, userId: user.id, role: user.role, action: 'auth.login' });
      return replyOk(reply, session);
    }
  );

  app.post('/api/auth/refresh', { schema: { tags: ['Authentication'] } }, async (request, reply) => {
    const body = (request.body ?? {}) as { refreshToken?: string };
    if (!body.refreshToken) throw new AuthError('MISSING_REFRESH_TOKEN', 'Refresh token is required.');
    const payload = verifyRefreshToken(body.refreshToken);

    const stored = await prisma.refreshToken.findUnique({ where: { tokenHash: hashToken(body.refreshToken) } });
    if (!stored || stored.revokedAt || stored.expiresAt.getTime() < Date.now()) {
      throw new AuthError('INVALID_REFRESH_TOKEN', 'This refresh token has been revoked or expired.');
    }
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive) throw new AuthError('ACCOUNT_DISABLED', 'This account is not active.');

    await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
    const session = await issueSession(reply, user.id, user.email, user.name, user.role);
    return replyOk(reply, session);
  });

  app.post('/api/auth/logout', { preHandler: authenticate, schema: { tags: ['Authentication'] } }, async (request, reply) => {
    const body = (request.body ?? {}) as { refreshToken?: string };
    if (body.refreshToken) {
      await prisma.refreshToken.updateMany({
        where: { tokenHash: hashToken(body.refreshToken), revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    await auditLog({ request, userId: request.user!.id, role: request.user!.role, action: 'auth.logout' });
    return replyOk(reply, null, 'Logged out');
  });

  app.post('/api/auth/forgot-password', { config: { rateLimit: { max: 5, timeWindow: '1 minute' } }, schema: { tags: ['Authentication'] } }, async (request, reply) => {
    const body = (request.body ?? {}) as { email?: string };
    const email = (body.email ?? '').trim().toLowerCase();
    if (!email) throw new ValidationError('Email is required.');
    const user = await prisma.user.findUnique({ where: { email } });

    // Uniform response regardless of whether the account exists (no enumeration).
    let rawToken: string | undefined;
    if (user) {
      rawToken = randomToken(24);
      await prisma.passwordReset.create({
        data: { userId: user.id, tokenHash: hashToken(rawToken), expiresAt: new Date(Date.now() + ttlMs(config.passwordResetTtl)) },
      });
      await createNotification(user.id, 'system', 'Password reset requested', 'Use the reset link you received to set a new password.');
    }
    const result: Record<string, unknown> = { message: 'If that email exists, a password reset link has been generated.' };
    // Development convenience: surface the reset token only outside production.
    if (!config.isProd && rawToken) {
      result.devResetToken = rawToken;
    }
    return replyOk(reply, result);
  });

  app.post('/api/auth/reset-password', { schema: { tags: ['Authentication'] } }, async (request, reply) => {
    const body = (request.body ?? {}) as { token?: string; password?: string };
    if (!body.token || !body.password || body.password.length < 8) {
      throw new ValidationError('A valid token and a password of at least 8 characters are required.');
    }
    const record = await prisma.passwordReset.findUnique({ where: { tokenHash: hashToken(body.token) } });
    if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) {
      throw new ValidationError('This reset link is invalid or has expired.');
    }
    await prisma.$transaction([
      prisma.user.update({ where: { id: record.userId }, data: { passwordHash: await hashPassword(body.password) } }),
      prisma.passwordReset.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
      prisma.refreshToken.updateMany({ where: { userId: record.userId, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);
    await auditLog({ request, userId: record.userId, action: 'auth.reset_password' });
    return replyOk(reply, { message: 'Password updated. You can now log in.' });
  });

  app.get('/api/auth/me', { preHandler: authenticate, schema: { tags: ['Authentication'] } }, async (request, reply) => {
    return replyOk(reply, publicUser(await prisma.user.findUniqueOrThrow({ where: { id: request.user!.id } })));
  });
}