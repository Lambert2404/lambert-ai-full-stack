import type { FastifyReply, FastifyRequest } from 'fastify';
import { createHash, randomUUID } from 'node:crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from '../config.js';
import { AuthError, ForbiddenError } from './errors.js';
import type { User } from '@prisma/client';
import { prisma } from './prisma.js';

export type Role = 'student' | 'teacher' | 'admin';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthUser;
    requestId: string;
  }
}

export type JwtPayload = { sub: string; email: string; name: string; role: Role; type: 'access' | 'refresh'; jti: string };

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, config.bcryptRounds);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function signAccessToken(user: AuthUser): string {
  return jwt.sign({ type: 'access', email: user.email, name: user.name, role: user.role, jti: randomUUID() } as JwtPayload, config.jwt.secret, {
    subject: user.id,
    expiresIn: config.jwt.accessTtl as SignOptions['expiresIn'],
  });
}

export function signRefreshToken(userId: string): string {
  return jwt.sign({ type: 'refresh', role: 'student', email: '', name: '', jti: randomUUID() } as JwtPayload, config.jwt.refreshSecret, {
    subject: userId,
    expiresIn: config.jwt.refreshTtl as SignOptions['expiresIn'],
  });
}

export function verifyAccessToken(token: string): JwtPayload {
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
    if (decoded.type !== 'access') throw new Error('wrong token type');
    return decoded;
  } catch {
    throw new AuthError('INVALID_TOKEN', 'Your session is invalid or has expired');
  }
}

export function verifyRefreshToken(token: string): JwtPayload {
  try {
    const decoded = jwt.verify(token, config.jwt.refreshSecret) as JwtPayload;
    if (decoded.type !== 'refresh') throw new Error('wrong token type');
    return decoded;
  } catch {
    throw new AuthError('INVALID_REFRESH_TOKEN', 'Your refresh token is invalid or has expired');
  }
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Extract an AuthUser from an existing DB record (avoids leaking sensitive fields). */
export function toAuthUser(user: User): AuthUser {
  return { id: user.id, email: user.email, name: user.name, role: user.role as Role };
}

/** Fastify preHandler that authenticates the bearer token and loads the user. */
export async function authenticate(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new AuthError('MISSING_TOKEN', 'Authentication required');
  }
  const token = header.slice('Bearer '.length).trim();
  const payload = verifyAccessToken(token);

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || !user.isActive) {
    throw new AuthError('ACCOUNT_DISABLED', 'This account is not active or does not exist');
  }
  request.user = toAuthUser(user);
}

export function requireRole(...roles: Role[]) {
  // Must be async: a sync hook returning void never resolves in Fastify v5.
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    if (!request.user) throw new AuthError();
    if (!roles.includes(request.user.role)) {
      throw new ForbiddenError('This action requires elevated permissions');
    }
  };
}

export function isAdmin(request: FastifyRequest): boolean {
  return request.user?.role === 'admin';
}

/** Ensure the request user can access the given owner id (teachers can manage their own resources). */
export function assertOwnership(request: FastifyRequest, ownerId: string, label = 'resource'): void {
  const user = request.user!;
  if (user.role === 'admin') return;
  if (user.id !== ownerId) {
    throw new ForbiddenError(`You do not have access to this ${label}`);
  }
}