import { prisma } from '../lib/prisma.js';
import { ForbiddenError, NotFoundError } from '../lib/errors.js';
import { retrieveChunks } from '../lib/chunks.js';
import { systemPromptFor, wrapUntrusted, buildDocumentContext } from '../lib/aiModes.js';
import { routeGenerate, routeStream } from '../providers/router.js';
import { truncate } from '../lib/util.js';
import type { AuthUser } from '../lib/auth.js';
import type { AiModeId, AiTask } from '../lib/aiModes.js';
import type { ProviderMessage } from '../providers/types.js';

export interface Citation {
  documentId: string;
  documentName: string;
  pageNumber?: number;
  snippet: string;
}

export interface ChatResult {
  messageId: string;
  response: string;
  provider: string;
  model: string;
  citations: Citation[];
  title: string;
}

const HISTORY_LIMIT = 20;

/**
 * Load recent messages so the model has conversational context.
 * Uploaded documents come through `citations`, never as whole files. (§18)
 */
async function loadHistory(conversationId: string): Promise<ProviderMessage[]> {
  const rows = await prisma.message.findMany({
    where: { conversationId, role: { in: ['user', 'assistant'] } },
    orderBy: { createdAt: 'asc' },
    take: HISTORY_LIMIT,
  });
  return rows.map((m) => ({ role: m.role === 'user' ? ('user' as const) : ('assistant' as const), content: m.content }));
}

export async function assertConversationAccess(user: AuthUser, conversationId: string) {
  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!conversation) throw new NotFoundError('Conversation not found');
  if (user.role !== 'admin' && conversation.userId !== user.id) {
    throw new ForbiddenError('You do not have access to this conversation');
  }
  return conversation;
}

export async function retrieveContext(
  userId: string,
  documentIds: string[] | undefined,
  query: string
): Promise<{ citations: Citation[]; context: string }> {
  if (!documentIds || documentIds.length === 0) return { citations: [], context: '' };

  const docs = await prisma.document.findMany({
    where: { id: { in: documentIds }, userId },
    include: { material: { select: { name: true } } },
  });
  const allowedIds = docs.map((d) => d.id);
  if (allowedIds.length === 0) return { citations: [], context: '' };

  const chunks = await prisma.documentChunk.findMany({
    where: { documentId: { in: allowedIds } },
    orderBy: { index: 'asc' },
  });

  const ranked = retrieveChunks({
    query,
    candidates: chunks.map((c) => ({
      id: c.id,
      documentId: c.documentId,
      index: c.index,
      content: c.content,
      embeddingJson: c.embedding as unknown,
      metadata: c.metadata as unknown,
    })),
    k: 6,
    minScore: 0.05,
  });

  const docName = new Map(docs.map((d) => [d.id, d.material.name]));
  const citations: Citation[] = ranked.map((r) => ({
    documentId: r.documentId,
    documentName: docName.get(r.documentId) ?? 'Document',
    pageNumber: r.page,
    snippet: r.content.slice(0, 240),
  }));
  const context = buildDocumentContext(
    ranked.map((r) => ({
      documentName: docName.get(r.documentId) ?? 'Document',
      index: r.index + 1,
      content: r.content,
      page: r.page,
    }))
  );
  return { citations, context };
}

export interface RunMessageInput {
  user: AuthUser;
  conversationId: string;
  content: string;
  mode: AiModeId;
  providerId?: string;
  attachmentDocumentIds?: string[];
  language?: string;
  task?: AiTask;
  signal?: AbortSignal;
}

export async function runConversationMessage(input: RunMessageInput) {
  const conversation = await assertConversationAccess(input.user, input.conversationId);

  await prisma.message.create({
    data: {
      conversationId: input.conversationId,
      role: 'user',
      content: input.content,
    },
  });

  // First user message -> derive a title.
  let title = conversation.title;
  const userMsgCount = await prisma.message.count({
    where: { conversationId: input.conversationId, role: 'user' },
  });
  if (userMsgCount === 1 && (title === 'New conversation' || !title)) {
    title = truncate(input.content, 60);
    await prisma.conversation.update({
      where: { id: input.conversationId },
      data: { title, mode: input.mode },
    });
  } else if (title === 'New conversation') {
    await prisma.conversation.update({
      where: { id: input.conversationId },
      data: { mode: input.mode },
    });
  }

  const { citations, context } = await retrieveContext(input.user.id, input.attachmentDocumentIds, input.content);

  const history = await loadHistory(input.conversationId);
  const system = context
    ? `${systemPromptFor(input.mode)}\n\nRelevant document context to answer from:\n${context}`
    : systemPromptFor(input.mode);

  const result = await routeGenerate(
    {
      task: input.task ?? taskForMode(input.mode),
      providerCode: (input.providerId as 'openai' | 'microsoft' | 'google_gemini' | 'anthropic_claude' | 'lambert_auto') ?? 'lambert_auto',
      mode: input.mode,
      system,
      messages: history,
      userId: input.user.id,
      conversationId: input.conversationId,
      citations,
    },
    input.signal
  );

  const saved = await prisma.message.create({
    data: {
      conversationId: input.conversationId,
      role: 'assistant',
      content: result.response,
      provider: result.providerCode,
      model: result.model,
      task: input.task ?? taskForMode(input.mode),
      sources: (citations.length ? citations : undefined) as never,
    },
  });

  await prisma.conversation.update({
    where: { id: input.conversationId },
    data: { providerId: input.providerId ?? 'lambert_auto', language: input.language ?? conversation.language },
  });

  return {
    messageId: saved.id,
    response: result.response,
    provider: result.providerCode,
    model: result.model,
    citations,
    title,
  };
}

export async function* streamConversationMessage(input: RunMessageInput) {
  const conversation = await assertConversationAccess(input.user, input.conversationId);
  const message = await prisma.message.create({
    data: { conversationId: input.conversationId, role: 'user', content: input.content },
  });
  void message;

  let title = conversation.title;
  const userMsgCount = await prisma.message.count({
    where: { conversationId: input.conversationId, role: 'user' },
  });
  if (userMsgCount === 1) {
    title = truncate(input.content, 60);
    await prisma.conversation.update({ where: { id: input.conversationId }, data: { title } });
  }

  const { citations, context } = await retrieveContext(input.user.id, input.attachmentDocumentIds, input.content);
  const history = await loadHistory(input.conversationId);
  // The just-created user message is already part of history.
  const system = context ? `${systemPromptFor(input.mode)}\n\n${context}` : systemPromptFor(input.mode);

  let assistantText = '';
  let finalProvider = '';
  let finalModel = '';

  const stream = routeStream(
    {
      task: input.task ?? taskForMode(input.mode),
      providerCode: (input.providerId as 'openai' | 'microsoft' | 'google_gemini' | 'anthropic_claude' | 'lambert_auto') ?? 'lambert_auto',
      mode: input.mode,
      system,
      messages: history,
      userId: input.user.id,
      conversationId: input.conversationId,
    },
    input.signal
  );

  while (true) {
    const next = await stream.next();
    if (next.done) {
      const result = next.value;
      finalProvider = result?.providerCode ?? '';
      finalModel = result?.model ?? '';
      break;
    }
    const delta = next.value.delta;
    assistantText += delta;
    yield { type: 'delta' as const, delta };
  }

  const saved = await prisma.message.create({
    data: {
      conversationId: input.conversationId,
      role: 'assistant',
      content: assistantText,
      provider: finalProvider || undefined,
      model: finalModel || undefined,
      sources: (citations.length ? citations : undefined) as never,
    },
  });

  yield {
    type: 'done' as const,
    message: saved,
    citations,
    title,
    provider: finalProvider,
    model: finalModel,
  };
}

export async function regenerateLastAssistant(user: AuthUser, conversationId: string, signal?: AbortSignal) {
  await assertConversationAccess(user, conversationId);
  const last = await prisma.message.findFirst({
    where: { conversationId, role: 'assistant' },
    orderBy: { createdAt: 'desc' },
  });
  if (!last) throw new NotFoundError('No assistant message to regenerate');
  const previousUser = await prisma.message.findFirst({
    where: { conversationId, role: 'user', createdAt: { lt: last.createdAt } },
    orderBy: { createdAt: 'desc' },
  });
  if (!previousUser) throw new NotFoundError('No preceding user message to regenerate');

  // Mark the old assistant message as superseded by replacing its content later.
  return runConversationMessage({
    user,
    conversationId,
    content: previousUser.content,
    mode: (await prisma.conversation.findUnique({ where: { id: conversationId } }))?.mode as AiModeId,
    providerId: undefined,
    signal,
  }).then(async (res) => {
    await prisma.message.delete({ where: { id: last.id } });
    return res;
  });
}

const activeStreams = new Map<string, AbortController>();

export function startStreamController(conversationId: string): AbortController {
  const controller = new AbortController();
  activeStreams.set(conversationId, controller);
  return controller;
}

export function stopConversation(conversationId: string): boolean {
  const controller = activeStreams.get(conversationId);
  if (!controller) return false;
  controller.abort();
  activeStreams.delete(conversationId);
  return true;
}

export function finishStream(conversationId: string): void {
  activeStreams.delete(conversationId);
}

/** Wrap user text in sandbox labels so documents can never override the system. */
export function sandboxUserContent(content: string): string {
  return wrapUntrusted(content, 'user content');
}

function taskForMode(mode: AiModeId): AiTask {
  switch (mode) {
    case 'tutor':
      return 'tutoring';
    case 'exam':
    case 'revision':
      return 'tutoring';
    case 'homework_helper':
    case 'quiz_me':
      return 'problem_solving';
    case 'explain_simply':
      return 'summarization';
    case 'deep_learning':
      return 'engineering_explanation';
    case 'document_tutor':
      return 'document_analysis';
    case 'engineering_tutor':
      return 'engineering_explanation';
  }
}