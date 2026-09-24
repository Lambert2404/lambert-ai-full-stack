import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../lib/auth.js';
import { NotFoundError, ValidationError } from '../lib/errors.js';
import { replyOk } from '../lib/envelope.js';
import {
  runConversationMessage,
  streamConversationMessage,
  regenerateLastAssistant,
  stopConversation,
  startStreamController,
  finishStream,
  assertConversationAccess,
} from '../services/chat.js';
import { truncate } from '../lib/util.js';
import type { AiModeId } from '../lib/aiModes.js';

const VALID_MODES = ['tutor', 'exam', 'homework_helper', 'quiz_me', 'explain_simply', 'deep_learning', 'revision', 'document_tutor', 'engineering_tutor'];
const VALID_PROVIDERS = ['lambert_auto', 'openai', 'microsoft', 'google_gemini', 'anthropic_claude'];

const createConvSchema = z.object({
  mode: z.string().refine((m) => VALID_MODES.includes(m)).default('tutor'),
  subjectId: z.string().optional(),
  language: z.enum(['en', 'sw']).default('en'),
});

const sendMsgSchema = z.object({
  content: z.string().trim().min(1).max(16000),
  mode: z.string().refine((m) => VALID_MODES.includes(m)).default('tutor'),
  providerId: z.string().refine((p) => VALID_PROVIDERS.includes(p)).default('lambert_auto'),
  attachmentDocumentIds: z.array(z.string()).max(10).optional(),
  language: z.enum(['en', 'sw']).optional(),
});

function toMessageDto(m: {
  id: string;
  conversationId: string;
  role: string;
  content: string;
  createdAt: Date;
  sources: unknown;
  error: string | null;
}) {
  return {
    id: m.id,
    conversationId: m.conversationId,
    role: m.role,
    content: m.content,
    createdAt: m.createdAt.toISOString(),
    sources: (m.sources as { documentId: string; documentName: string; pageNumber?: number; snippet: string }[]) ?? [],
    error: m.error ?? undefined,
  };
}

export async function chatRoutes(app: FastifyInstance) {
  // ---- Conversations -----------------------------------------------------

  app.get('/api/conversations', { preHandler: authenticate, schema: { tags: ['Chat'] } }, async (request, reply) => {
    const convs = await prisma.conversation.findMany({
      where: { userId: request.user!.id },
      orderBy: { updatedAt: 'desc' },
      include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });
    const data = convs.map((c) => ({
      id: c.id,
      title: c.title,
      mode: c.mode,
      subjectId: c.subjectId ?? undefined,
      bookmarked: c.bookmarked,
      updatedAt: c.updatedAt.toISOString(),
      createdAt: c.createdAt.toISOString(),
      lastMessagePreview: c.messages[0] ? truncate(c.messages[0].content, 100) : undefined,
    }));
    return replyOk(reply, data);
  });

  app.post('/api/conversations', { preHandler: authenticate, schema: { tags: ['Chat'] } }, async (request, reply) => {
    const parsed = createConvSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError('Invalid conversation settings');
    const conv = await prisma.conversation.create({
      data: {
        userId: request.user!.id,
        mode: parsed.data.mode,
        subjectId: parsed.data.subjectId,
        language: parsed.data.language,
      },
    });
    return replyOk(reply, toConversationDto(conv));
  });

  app.get('/api/conversations/:id', { preHandler: authenticate, schema: { tags: ['Chat'] } }, async (request, reply) => {
    const conv = await assertConversationAccess(request.user!, (request.params as { id: string }).id);
    return replyOk(reply, toConversationDto(conv));
  });

  app.patch('/api/conversations/:id', { preHandler: authenticate, schema: { tags: ['Chat'] } }, async (request, reply) => {
    const conv = await assertConversationAccess(request.user!, (request.params as { id: string }).id);
    const body = (request.body ?? {}) as { title?: string; bookmarked?: boolean; mode?: string };
    const updated = await prisma.conversation.update({
      where: { id: conv.id },
      data: {
        ...(body.title !== undefined ? { title: String(body.title).slice(0, 120) } : {}),
        ...(body.bookmarked !== undefined ? { bookmarked: Boolean(body.bookmarked) } : {}),
        ...(body.mode !== undefined && VALID_MODES.includes(body.mode) ? { mode: body.mode } : {}),
      },
    });
    return replyOk(reply, toConversationDto(updated));
  });

  app.delete('/api/conversations/:id', { preHandler: authenticate, schema: { tags: ['Chat'] } }, async (request, reply) => {
    const conv = await assertConversationAccess(request.user!, (request.params as { id: string }).id);
    await prisma.conversation.delete({ where: { id: conv.id } });
    return replyOk(reply, null, 'Conversation deleted');
  });

  app.get('/api/conversations/:id/messages', { preHandler: authenticate, schema: { tags: ['Chat'] } }, async (request, reply) => {
    await assertConversationAccess(request.user!, (request.params as { id: string }).id);
    const messages = await prisma.message.findMany({
      where: { conversationId: (request.params as { id: string }).id },
      orderBy: { createdAt: 'asc' },
    });
    return replyOk(reply, messages.map(toMessageDto as never));
  });

  // ---- Turn: full response -----------------------------------------------

  app.post(
    '/api/conversations/:id/messages',
    { preHandler: authenticate, config: { rateLimit: { max: 30, timeWindow: '1 minute' } }, schema: { tags: ['Chat'] } },
    async (request, reply) => {
      const params = request.params as { id: string };
      const parsed = sendMsgSchema.safeParse(request.body);
      if (!parsed.success) throw new ValidationError('Invalid message payload');
      const conversation = await assertConversationAccess(request.user!, params.id);

      const result = await runConversationMessage({
        user: request.user!,
        conversationId: params.id,
        content: parsed.data.content,
        mode: parsed.data.mode as AiModeId,
        providerId: parsed.data.providerId,
        attachmentDocumentIds: parsed.data.attachmentDocumentIds,
        language: parsed.data.language ?? conversation.language,
      });

      const assistant = await prisma.message.findUniqueOrThrow({ where: { id: result.messageId } });
      return replyOk(reply, toMessageDto(assistant));
    }
  );

  app.post(
    '/api/conversations/:id/messages/:msgId/regenerate',
    { preHandler: authenticate, config: { rateLimit: { max: 15, timeWindow: '1 minute' } }, schema: { tags: ['Chat'] } },
    async (request, reply) => {
      const params = request.params as { id: string; msgId: string };
      const result = await regenerateLastAssistant(request.user!, params.id);
      return replyOk(reply, { ...result });
    }
  );

  app.post(
    '/api/conversations/:id/stop',
    { preHandler: authenticate, schema: { tags: ['Chat'] } },
    async (request, reply) => {
      const params = request.params as { id: string };
      const stopped = stopConversation(params.id);
      return replyOk(reply, { stopped });
    }
  );

  // ---- Standalone chat (PDF §15) -----------------------------------------

  app.post('/api/chat', { preHandler: authenticate, config: { rateLimit: { max: 30, timeWindow: '1 minute' } }, schema: { tags: ['Chat'] } }, async (request, reply) => {
    const parsed = sendMsgSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError('Invalid message payload');

    const conversation = await prisma.conversation.create({
      data: { userId: request.user!.id, mode: parsed.data.mode, language: parsed.data.language ?? 'en' },
    });
    const result = await runConversationMessage({
      user: request.user!,
      conversationId: conversation.id,
      content: parsed.data.content,
      mode: parsed.data.mode as AiModeId,
      providerId: parsed.data.providerId,
      attachmentDocumentIds: parsed.data.attachmentDocumentIds,
      language: parsed.data.language,
    });
    return replyOk(reply, {
      conversationId: conversation.id,
      provider: result.provider,
      model: result.model,
      result: result.response,
      citations: result.citations,
      conversation,
      message: result,
    });
  });

  // ---- Streaming (SSE) ---------------------------------------------------

  app.post(
    '/api/chat/stream',
    { preHandler: authenticate, config: { rateLimit: { max: 30, timeWindow: '1 minute' } }, schema: { tags: ['Chat'] } },
    async (request: FastifyRequest, reply) => {
      const parsed = sendMsgSchema.safeParse(request.body);
      if (!parsed.success) throw new ValidationError('Invalid message payload');

      const requestedId = (request.body as { conversationId?: string }).conversationId;
      const conversationId = requestedId
        ? (await assertConversationAccess(request.user!, requestedId)).id
        : (
            await prisma.conversation.create({
              data: { userId: request.user!.id, mode: parsed.data.mode, language: parsed.data.language ?? 'en' },
            })
          ).id;

      const controller = startStreamController(conversationId);
      reply.hijack();
      const raw = reply.raw;
      raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      });
      raw.write(': connected\n\n');

      const send = (event: string, payload: unknown) => {
        raw.write(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);
      };

      try {
        for await (const chunk of streamConversationMessage({
          user: request.user!,
          conversationId,
          content: parsed.data.content,
          mode: parsed.data.mode as AiModeId,
          providerId: parsed.data.providerId,
          attachmentDocumentIds: parsed.data.attachmentDocumentIds,
          language: parsed.data.language,
          signal: controller.signal,
        })) {
          if (chunk.type === 'delta') {
            send('delta', { delta: chunk.delta, conversationId });
          } else if (chunk.type === 'done') {
            send('done', {
              conversationId,
              messageId: chunk.message.id,
              content: chunk.message.content,
              provider: chunk.provider,
              model: chunk.model,
              citations: chunk.citations,
              title: chunk.title,
              createdAt: chunk.message.createdAt.toISOString(),
            });
          }
        }
        send('end', { conversationId });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Generation failed';
        send('error', { conversationId, message, code: err instanceof NotFoundError ? 'NOT_FOUND' : 'AI_ERROR' });
      } finally {
        finishStream(conversationId);
        raw.end();
      }
    }
  );
}

function toConversationDto(c: {
  id: string;
  title: string;
  mode: string;
  subjectId: string | null;
  bookmarked: boolean;
  language: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: c.id,
    title: c.title,
    mode: c.mode,
    subjectId: c.subjectId ?? undefined,
    bookmarked: c.bookmarked,
    language: c.language,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}