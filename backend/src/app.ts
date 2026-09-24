import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import rateLimit from '@fastify/rate-limit';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { config, type AppConfig } from './config.js';
import { logger } from './lib/logger.js';
import { prisma } from './lib/prisma.js';
import { AppError } from './lib/errors.js';
import { registerAudit } from './lib/audit.js';
import { corsOptions, helmetOptions, GLOBAL_RATE_LIMIT } from './lib/security.js';
import { MAX_UPLOAD_BYTES } from './services/documents.js';

import { authRoutes } from './routes/auth.js';
import { userRoutes } from './routes/users.js';
import { subjectRoutes } from './routes/subjects.js';
import { aiRoutes } from './routes/ai.js';
import { chatRoutes } from './routes/chat.js';
import { documentRoutes } from './routes/documents.js';
import { pastPaperRoutes } from './routes/pastPapers.js';
import { quizRoutes } from './routes/quizzes.js';
import { studyPlanRoutes } from './routes/studyPlans.js';
import { progressRoutes } from './routes/progress.js';
import { notificationRoutes } from './routes/notifications.js';
import { bookmarkRoutes } from './routes/bookmarks.js';
import { searchRoutes } from './routes/search.js';
import { voiceRoutes } from './routes/voice.js';
import { adminRoutes } from './routes/admin.js';
import { healthRoutes } from './routes/health.js';

declare module 'fastify' {
  interface FastifyInstance {
    config: AppConfig;
  }
}

function envelopeError(error: AppError): Record<string, unknown> {
  return { success: false, data: null, message: error.message, error: { code: error.code } };
}

export async function buildApp(): Promise<FastifyInstance> {
  // Ensure storage locations exist before plugins/routes reference them.
  mkdirSync(path.resolve(process.cwd(), config.storageDir), { recursive: true });
  mkdirSync(path.resolve(process.cwd(), config.storageDir, 'audio'), { recursive: true });

  const app = Fastify({
    logger: false,
    bodyLimit: MAX_UPLOAD_BYTES(),
    requestIdHeader: 'x-request-id',
  });

  // ---- shared config + request ids ----------------------------------------
  app.decorate('config', config);
  app.addHook('onRequest', (request, _reply, done) => {
    request.requestId = request.id;
    done();
  });

  // ---- security -------------------------------------------------------------
  await app.register(helmet, helmetOptions);
  await app.register(cors, corsOptions(app));
  await app.register(rateLimit, {
    max: GLOBAL_RATE_LIMIT.max,
    timeWindow: GLOBAL_RATE_LIMIT.timeWindow,
    keyGenerator: (request) => {
      const xff = request.headers['x-forwarded-for'];
      if (Array.isArray(xff)) return xff[0] ?? request.ip;
      if (typeof xff === 'string') return xff.split(',')[0]?.trim() || request.ip;
      return request.ip;
    },
    errorResponseBuilder: () => ({
      success: false,
      data: null,
      message: 'Too many requests. Please slow down.',
      error: { code: 'RATE_LIMITED' },
    }),
  });

  // ---- input ---------------------------------------------------------------
  await app.register(multipart, {
    limits: { fileSize: MAX_UPLOAD_BYTES(), files: 1, fields: 20 },
  });

  // ---- observability --------------------------------------------------------
  registerAudit(app);

  // ---- API docs (OpenAPI) ---------------------------------------------------
  await app.register(swagger, {
    swagger: {
      info: {
        title: 'LAMBERT AI API',
        description: 'Your Intelligent Study Companion - backend API',
        version: '1.0.0',
      },
      schemes: ['http', 'https'],
      consumes: ['application/json'],
      produces: ['application/json'],
      securityDefinitions: {
        bearerAuth: { type: 'apiKey', name: 'Authorization', in: 'header' },
      },
      security: [{ bearerAuth: [] }],
    },
  });
  await app.register(swaggerUi, {
    routePrefix: '/docs',
    staticCSP: true,
  });

  // ---- errors -----------------------------------------------------------------
  // Error handlers must be registered before route plugins: Fastify snapshots the
  // error handler into each encapsulated context at register time.
  app.setNotFoundHandler((_request, reply) => {
    return reply.status(404).send({ success: false, data: null, message: 'Route not found', error: { code: 'NOT_FOUND' } });
  });

  app.setErrorHandler((error: unknown, request: FastifyRequest, reply: FastifyReply) => {
    if (error instanceof AppError) {
      return reply.status(error.status).send(envelopeError(error));
    }

    const fastifyError = error as { statusCode?: number; code?: string; name?: string };
    const status = fastifyError.statusCode ?? 500;
    const code = fastifyError.code ?? (status >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR');

    // 4xx rejection details (validation, bad body, too large) are safe to echo.
    const clientFacing =
      status < 500
        ? error instanceof Error
          ? error.message
          : 'The request could not be processed.'
        : 'An unexpected error occurred. Please try again later.';

    if (status >= 500) {
      logger.error({ err: error, requestId: request.requestId, method: request.method, url: request.url }, 'unhandled error');
    }

    if (reply.sent) {
      request.log.warn({ err: error }, 'response already sent - cannot write error envelope');
      return reply;
    }
    return reply.status(status).send({ success: false, data: null, message: clientFacing, error: { code } });
  });

  // ---- routes ---------------------------------------------------------------
  await app.register(authRoutes);
  await app.register(userRoutes);
  await app.register(subjectRoutes);
  await app.register(aiRoutes);
  await app.register(chatRoutes);
  await app.register(documentRoutes);
  await app.register(pastPaperRoutes);
  await app.register(quizRoutes);
  await app.register(studyPlanRoutes);
  await app.register(progressRoutes);
  await app.register(notificationRoutes);
  await app.register(bookmarkRoutes);
  await app.register(searchRoutes);
  await app.register(voiceRoutes);
  await app.register(adminRoutes);
  await app.register(healthRoutes);

  app.get('/', { schema: { hide: true } }, async (_request, reply) => {
    return reply.send({
      success: true,
      data: {
        service: 'LAMBERT AI API',
        version: '1.0.0',
        docs: '/docs',
        health: '/health',
      },
      message: null,
      error: null,
    });
  });

  return app;
}

export async function startServer(): Promise<void> {
  const app = await buildApp();
  try {
    await app.listen({ port: config.port, host: config.host });
    logger.info(`LAMBERT AI backend listening on http://${config.host}:${config.port}`);
    logger.info(`API docs available at http://localhost:${config.port}/docs`);
  } catch (err) {
    logger.error({ err }, 'server failed to start');
    await prisma.$disconnect();
    process.exit(1);
  }

  const shutdown = async () => {
    logger.info('shutting down...');
    await app.close();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}