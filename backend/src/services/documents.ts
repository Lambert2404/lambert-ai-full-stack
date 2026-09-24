import { config } from '../config.js';
import { prisma } from '../lib/prisma.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../lib/errors.js';
import { chunkText, embedText, tokenize, retrieveChunks } from '../lib/chunks.js';
import { extractText } from '../lib/text.js';
import { detectFileType, randomCryptoId, safeFileName } from '../lib/util.js';
import { systemPromptFor, wrapUntrusted } from '../lib/aiModes.js';
import { routeGenerate } from '../providers/router.js';
import { createNotification } from './notify.js';
import type { AuthUser } from '../lib/auth.js';
import type { Citation } from './chat.js';

export const MAX_UPLOAD_BYTES = () => config.maxUploadMb * 1024 * 1024;

export function validateUpload(fileName: string, size: number): { fileType: 'pdf' | 'docx' | 'txt'; storageKey: string } {
  const fileType = detectFileType(fileName);
  if (!fileType) {
    throw new ValidationError('Unsupported file type. Upload PDF, DOCX or TXT files.');
  }
  if (size <= 0) throw new ValidationError('Uploaded file is empty.');
  if (size > MAX_UPLOAD_BYTES()) {
    throw new ValidationError(`File is too large. Maximum size is ${config.maxUploadMb} MB.`);
  }
  return { fileType, storageKey: randomCryptoId(safeFileName(fileName)) };
}

/**
 * Validate the buffer, store it privately, then run the extraction -> chunking
 * -> embedding -> indexing pipeline. (§17 / §18 / §36)
 */
export async function ingestMaterial(input: {
  user: AuthUser;
  fileName: string;
  buffer: Buffer;
  subjectId?: string;
  topicId?: string;
}) {
  const { fileType, storageKey } = validateUpload(input.fileName, input.buffer.length);
  const persistPath = await persistFile(storageKey, input.buffer);

  const material = await prisma.studyMaterial.create({
    data: {
      userId: input.user.id,
      subjectId: input.subjectId,
      topicId: input.topicId,
      name: safeFileName(input.fileName),
      fileType,
      sizeBytes: input.buffer.length,
      status: 'processing',
      storageKey: persistPath,
    },
  });

  const document = await prisma.document.create({
    data: {
      userId: input.user.id,
      materialId: material.id,
      title: material.name,
      status: 'processing',
    },
  });

  try {
    const { text, pages } = await extractText(input.buffer, material.name);
    if (!text || text.length < 40) {
      throw new ValidationError('No usable text could be extracted from this document.');
    }

    const chunks = chunkText(text);
    const rows = chunks.map((content, index) => ({
      documentId: document.id,
      index,
      content,
      embedding: embedText(content),
      tokenCount: tokenize(content).length,
      metadata: pages ? { page: estimatePage(index, chunks.length, pages) } : undefined,
    }));

    await prisma.documentChunk.createMany({ data: rows as never });

    await prisma.$transaction([
      prisma.document.update({ where: { id: document.id }, data: { status: 'ready', chunkCount: chunks.length } }),
      prisma.studyMaterial.update({ where: { id: material.id }, data: { status: 'ready', pages } }),
    ]);

    await prisma.studyActivity.create({
      data: { userId: input.user.id, subjectId: input.subjectId, topicId: input.topicId, type: 'document' },
    });

    await createNotification(
      input.user.id,
      'new_material',
      'Document ready',
      `"${material.name}" has been indexed and is ready for questions.`
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Document processing failed.';
    await prisma.$transaction([
      prisma.document.update({ where: { id: document.id }, data: { status: 'failed', errorMessage: message } }),
      prisma.studyMaterial.update({ where: { id: material.id }, data: { status: 'failed', errorMessage: message } }),
    ]);
    const updated = await prisma.studyMaterial.findUnique({
      where: { id: material.id },
      include: { document: true },
    });
    return updated!;
  }

  return prisma.studyMaterial.findUnique({
    where: { id: material.id },
    include: { document: true },
  });
}

function estimatePage(chunkIndex: number, totalChunks: number, pages: number): number {
  if (totalChunks <= 1) return 1;
  return Math.min(pages, 1 + Math.floor((chunkIndex / totalChunks) * pages));
}

async function persistFile(storageKey: string, buffer: Buffer): Promise<string> {
  const { mkdir, writeFile } = await import('node:fs/promises');
  const path = await import('node:path');
  const uploadDir = path.resolve(process.cwd(), config.storageDir);
  await mkdir(uploadDir, { recursive: true });
  const target = path.join(uploadDir, storageKey);
  await writeFile(target, buffer);
  return storageKey;
}

export async function buildStorageUrl(storageKey: string): Promise<string> {
  await import('node:path');
  return `/storage/${encodeURIComponent(storageKey)}`;
}

export async function assertMaterialAccess(user: AuthUser, materialId: string) {
  const material = await prisma.studyMaterial.findUnique({
    where: { id: materialId },
    include: { document: { include: { chunks: { orderBy: { index: 'asc' }, take: 0 } } } },
  });
  if (!material) throw new NotFoundError('Material not found');
  if (user.role !== 'admin' && material.userId !== user.id) {
    throw new ForbiddenError('You do not have access to this material');
  }
  return material;
}

export async function askDocument(input: { user: AuthUser; documentId: string; question: string }) {
  const document = await prisma.document.findUnique({
    where: { id: input.documentId },
    include: { material: { select: { name: true } } },
  });
  if (!document) throw new NotFoundError('Document not found');
  if (input.user.role !== 'admin' && document.userId !== input.user.id) {
    throw new ForbiddenError('You do not have access to this document');
  }
  if (document.status !== 'ready') {
    throw new ValidationError('This document is not ready yet. Wait for indexing to finish first.');
  }

  const chunks = await prisma.documentChunk.findMany({
    where: { documentId: document.id },
    orderBy: { index: 'asc' },
  });
  const ranked = retrieveChunks({
    query: input.question,
    candidates: chunks.map((c) => ({
      id: c.id,
      documentId: c.documentId,
      index: c.index,
      content: c.content,
      embeddingJson: c.embedding as unknown,
      metadata: c.metadata as unknown,
    })),
    k: 5,
    minScore: 0.05,
  });
  if (ranked.length === 0) throw new ValidationError('No relevant content was found for this question.');

  const citations: Citation[] = ranked.map((r) => ({
    documentId: document.id,
    documentName: document.material.name,
    pageNumber: r.page,
    snippet: r.content.slice(0, 240),
  }));
  const context = ranked
    .map((r) => `[Source ${r.index + 1}: ${document.material.name}] ${wrapUntrusted(r.content, 'document excerpt')}`)
    .join('\n\n');

  const result = await routeGenerate({
    task: 'document_analysis',
    providerCode: 'lambert_auto',
    mode: 'document_tutor',
    userId: input.user.id,
    system: `${systemPromptFor('document_tutor')}\n\nDocument context:\n${context}`,
    messages: [{ role: 'user', content: wrapUntrusted(input.question) }],
  });

  return { response: result.response, citations };
}

/** Best-effort extraction of a JSON object from an LLM response. */
export function parseJsonFromResponse(text: string): unknown {
  const cleaned = text.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // fall back to first balanced {...} or [...] block
    for (const open of ['{', '[']) {
      const close = open === '{' ? '}' : ']';
      const start = cleaned.indexOf(open);
      if (start === -1) continue;
      let depth = 0;
      for (let i = start; i < cleaned.length; i++) {
        const ch = cleaned[i];
        if (ch === open) depth++;
        else if (ch === close) {
          depth--;
          if (depth === 0) {
            const candidate = cleaned.slice(start, i + 1);
            try {
              return JSON.parse(candidate);
            } catch {
              break;
            }
          }
        }
      }
    }
    throw new ValidationError('The AI returned malformed data. Please try again.');
  }
}