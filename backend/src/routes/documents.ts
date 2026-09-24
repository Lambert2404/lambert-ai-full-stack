import type { FastifyInstance } from 'fastify';
import path from 'node:path';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../lib/auth.js';
import { NotFoundError, ValidationError, ForbiddenError } from '../lib/errors.js';
import { replyOk } from '../lib/envelope.js';
import { ingestMaterial, askDocument, assertMaterialAccess, MAX_UPLOAD_BYTES } from '../services/documents.js';
import { config } from '../config.js';

const STATUS_ORDER: Record<string, number> = { uploading: 0, processing: 1, indexing: 2, ready: 3, failed: 4 };

function materialDto(m: {
  id: string;
  name: string;
  subjectId: string | null;
  topicId: string | null;
  fileType: string;
  sizeBytes: number;
  pages: number | null;
  status: string;
  errorMessage: string | null;
  createdAt: Date;
  document?: { id: string; chunkCount: number } | null;
}) {
  return {
    id: m.id,
    name: m.name,
    subjectId: m.subjectId ?? undefined,
    fileType: m.fileType,
    sizeBytes: m.sizeBytes,
    pages: m.pages ?? undefined,
    status: m.status,
    uploadedAt: m.createdAt.toISOString(),
    errorMessage: m.errorMessage ?? undefined,
    documentId: m.document?.id,
    chunkCount: m.document?.chunkCount ?? 0,
  };
}

export async function documentRoutes(app: FastifyInstance) {
  const uploadHandler = async (request: any, reply: any) => {
    const data = await (request as any).file({
      limits: { fileSize: MAX_UPLOAD_BYTES(), files: 1 },
    });
    if (!data) throw new ValidationError('No file was uploaded.');
    const { filename, file } = data;
    const subjectId = ((request.body as any)?.subjectId as string) ?? undefined;
    const topicId = ((request.body as any)?.topicId as string) ?? undefined;

    const buffers: Buffer[] = [];
    for await (const chunk of file) {
      buffers.push(chunk as Buffer);
      if (buffers.reduce((a, b) => a + b.length, 0) > MAX_UPLOAD_BYTES()) {
        throw new ValidationError(`File is too large. Maximum size is ${config.maxUploadMb} MB.`);
      }
    }
    const buffer = Buffer.concat(buffers);

    const material = await ingestMaterial({
      user: request.user!,
      fileName: filename,
      buffer,
      subjectId,
      topicId,
    });

    return reply.status(201).send({ success: true, data: materialDto(material as never), message: 'Upload accepted', error: null });
  };

  app.post('/api/materials/upload', { preHandler: authenticate, bodyLimit: MAX_UPLOAD_BYTES(), config: { rateLimit: { max: 20, timeWindow: '1 minute' } } }, (request, reply) =>
    uploadHandler(request, reply)
  );

  app.get('/api/materials', { preHandler: authenticate, schema: { tags: ['Documents'] } }, async (request, reply) => {
    const materials = await prisma.studyMaterial.findMany({
      where: { userId: request.user!.id },
      orderBy: { createdAt: 'desc' },
      include: { document: { select: { id: true, chunkCount: true } } },
    });
    return replyOk(
      reply,
      materials
        .slice()
        .sort((a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9))
        .map(materialDto as never)
    );
  });

  app.get('/api/materials/:id', { preHandler: authenticate, schema: { tags: ['Documents'] } }, async (request, reply) => {
    const material = await assertMaterialAccess(request.user!, (request.params as { id: string }).id);
    return replyOk(reply, materialDto(material as never));
  });

  app.get('/api/materials/:id/file', { preHandler: authenticate, schema: { tags: ['Documents'] } }, async (request, reply) => {
    const material = await assertMaterialAccess(request.user!, (request.params as { id: string }).id);
    const { createReadStream } = await import('node:fs');
    const { resolve } = path;
    const filePath = resolve(process.cwd(), config.storageDir, material.storageKey);
    const { stat } = await import('node:fs/promises');
    try {
      await stat(filePath);
    } catch {
      throw new NotFoundError('File no longer exists on the server');
    }
    return reply.type(contentTypeFor(material.fileType)).header('Content-Disposition', `attachment; filename="${material.name}"`).send(createReadStream(filePath));
  });

  app.delete('/api/materials/:id', { preHandler: authenticate, schema: { tags: ['Documents'] } }, async (request, reply) => {
    const material = await assertMaterialAccess(request.user!, (request.params as { id: string }).id);
    const { unlink } = await import('node:fs/promises');
    try {
      await unlink(path.resolve(process.cwd(), config.storageDir, material.storageKey));
    } catch {
      // file already gone - deletion still proceeds
    }
    await prisma.studyMaterial.delete({ where: { id: material.id } });
    return replyOk(reply, null, 'Material deleted');
  });

  // ---- /documents contract (PDF §17) -------------------------------------

  app.post('/api/documents/upload', { preHandler: authenticate, bodyLimit: MAX_UPLOAD_BYTES(), config: { rateLimit: { max: 20, timeWindow: '1 minute' } } }, (request, reply) =>
    uploadHandler(request, reply)
  );

  app.get('/api/documents', { preHandler: authenticate, schema: { tags: ['Documents'] } }, async (request, reply) => {
    const documents = await prisma.document.findMany({
      where: { userId: request.user!.id },
      orderBy: { updatedAt: 'desc' },
      include: { material: true },
    });
    return replyOk(
      reply,
      documents
        .slice()
        .sort((a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9))
        .map((d) => ({
          id: d.id,
          title: d.title,
          materialId: d.materialId,
          status: d.status,
          chunkCount: d.chunkCount,
          fileName: d.material.name,
          fileType: d.material.fileType,
          sizeBytes: d.material.sizeBytes,
          uploadedAt: d.createdAt.toISOString(),
          errorMessage: d.errorMessage ?? undefined,
        }))
    );
  });

  app.get('/api/documents/:id', { preHandler: authenticate, schema: { tags: ['Documents'] } }, async (request, reply) => {
    const document = await prisma.document.findUnique({ where: { id: (request.params as { id: string }).id }, include: { material: true } });
    if (!document) throw new NotFoundError('Document not found');
    if (request.user!.role !== 'admin' && document.userId !== request.user!.id) throw new ForbiddenError('Access denied');
    return replyOk(reply, document);
  });

  app.get('/api/documents/:id/status', { preHandler: authenticate, schema: { tags: ['Documents'] } }, async (request, reply) => {
    const document = await prisma.document.findUnique({ where: { id: (request.params as { id: string }).id } });
    if (!document) throw new NotFoundError('Document not found');
    if (request.user!.role !== 'admin' && document.userId !== request.user!.id) throw new ForbiddenError('Access denied');
    return replyOk(reply, { id: document.id, status: document.status, chunkCount: document.chunkCount, errorMessage: document.errorMessage });
  });

  app.delete('/api/documents/:id', { preHandler: authenticate, schema: { tags: ['Documents'] } }, async (request, reply) => {
    const document = await prisma.document.findUnique({ where: { id: (request.params as { id: string }).id } });
    if (!document) throw new NotFoundError('Document not found');
    if (request.user!.role !== 'admin' && document.userId !== request.user!.id) throw new ForbiddenError('Access denied');
    await prisma.studyMaterial.delete({ where: { id: document.materialId } });
    return replyOk(reply, null, 'Document deleted');
  });

  app.post('/api/documents/:id/ask', { preHandler: authenticate, config: { rateLimit: { max: 20, timeWindow: '1 minute' } }, schema: { tags: ['Documents'] } }, async (request, reply) => {
    const body = (request.body ?? {}) as { question?: string };
    if (!body.question?.trim()) throw new ValidationError('A question is required.');
    const { response, citations } = await askDocument({
      user: request.user!,
      documentId: (request.params as { id: string }).id,
      question: body.question.trim(),
    });
    return replyOk(reply, { response, citations });
  });
}

function contentTypeFor(fileType: string): string {
  switch (fileType) {
    case 'pdf':
      return 'application/pdf';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    default:
      return 'text/plain';
  }
}