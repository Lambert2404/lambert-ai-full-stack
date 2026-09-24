import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../lib/auth.js';
import { NotFoundError, ValidationError, ForbiddenError, AiUnavailableError } from '../lib/errors.js';
import { replyOk } from '../lib/envelope.js';
import { extractText } from '../lib/text.js';
import { parseJsonFromResponse, MAX_UPLOAD_BYTES } from '../services/documents.js';
import { routeGenerate } from '../providers/router.js';
import { systemPromptFor } from '../lib/aiModes.js';
import { detectFileType } from '../lib/util.js';
import { config } from '../config.js';
import { createNotification } from '../services/notify.js';

interface ParsedPaperQuestion {
  text: string;
  difficulty?: string;
  questionType?: string;
  options?: Array<{ id?: string; text?: string }>;
  answer?: string;
  topicName?: string | null;
}

async function analyzePaperText(userId: string, subjectId: string, year: number, name: string, text: string) {
  const topics = await prisma.topic.findMany({ where: { subjectId, isActive: true }, select: { id: true, name: true } });
  const topicNames = topics.map((t) => `${t.name}`).join('; ');

  const prompt = `
Analyze this past examination paper for the subject "${name}".

Extract every distinct question. Return strict JSON:
{
  "questions": [
    {
      "text": "full question text",
      "difficulty": "easy" | "medium" | "hard",
      "questionType": "mcq" | "short_answer" | "essay" | "calculation",
      "options": [ { "id": "a", "text": "..." } ],
      "answer": "concise model answer",
      "topicName": "one of: ${topicNames} or null if it matches no topic"
    }
  ]
}
Only include questions, never whole paper content. No markdown.

Paper text:
${text.slice(0, 60000)}`;

  const result = await routeGenerate({
    task: 'document_analysis',
    providerCode: 'lambert_auto',
    userId,
    system: systemPromptFor('exam'),
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2,
  });

  const parsed = parseJsonFromResponse(result.response) as { questions?: ParsedPaperQuestion[] };
  return (parsed.questions ?? []).filter((q) => q.text?.trim().length > 5).slice(0, 60);
}

export async function pastPaperRoutes(app: FastifyInstance) {
  const store = async (userId: string, name: string, subjectId: string, year: number, questions: ParsedPaperQuestion[]) => {
    const topicByName = new Map<string, string>();
    for (const t of await prisma.topic.findMany({ where: { subjectId } })) topicByName.set(t.name, t.id);

    const paper = await prisma.pastPaper.create({
      data: {
        userId,
        subjectId,
        name,
        year,
        status: 'ready',
        questionCount: questions.length,
      },
    });

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]!;
      const type = ['mcq', 'essay', 'calculation'].includes(q.questionType ?? '') ? q.questionType! : 'short_answer';
      const options =
        type === 'mcq' && Array.isArray(q.options) && q.options.length >= 2
          ? q.options.map((o, idx) => ({ id: o.id ?? ['a', 'b', 'c', 'd'][idx] ?? String(idx), text: o.text ?? '' }))
          : undefined;
      await prisma.pastPaperQuestion.create({
        data: {
          pastPaperId: paper.id,
          subjectId,
          topicId: q.topicName ? (topicByName.get(q.topicName) ?? null) : null,
          text: q.text,
          year,
          difficulty: q.difficulty && ['easy', 'medium', 'hard'].includes(q.difficulty) ? q.difficulty : 'medium',
          questionType: type,
          options: (options ?? undefined) as never,
          answer: q.answer ? ({ text: q.answer } as never) : undefined,
          order: i,
        },
      });
    }

    await createNotification(userId, 'new_material', 'Past paper analyzed', `"${name}" (${year}) - ${questions.length} questions extracted.`);
    return paper;
  };

  const paperInput = async (request: any) => {
    const data = await (request as any).file({ limits: { fileSize: MAX_UPLOAD_BYTES(), files: 1 } });
    if (!data) throw new ValidationError('A paper file is required.');
    const filename: string = data.filename ?? `paper-${Date.now()}.txt`;
    const subjectId = String((request.body as any)?.subjectId ?? '');
    const year = Number((request.body as any)?.year ?? new Date().getFullYear());
    if (!subjectId) throw new ValidationError('subjectId is required.');
    if (!Number.isInteger(year) || year < 1950 || year > 2100) throw new ValidationError('A valid year is required.');
    if (!detectFileType(filename)) throw new ValidationError('Unsupported file type. Upload PDF, DOCX or TXT files.');

    const buffers: Buffer[] = [];
    for await (const chunk of data.file) {
      buffers.push(chunk as Buffer);
      if (buffers.reduce((a, b) => a + b.length, 0) > MAX_UPLOAD_BYTES()) {
        throw new ValidationError(`File is too large. Maximum size is ${config.maxUploadMb} MB.`);
      }
    }
    return { filename, subjectId, year, buffer: Buffer.concat(buffers) };
  };

  app.post('/api/past-papers/analyze', { preHandler: authenticate, bodyLimit: MAX_UPLOAD_BYTES(), config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (request, reply) => {
    const { user } = request as any;
    const { filename, subjectId, year, buffer } = await paperInput(request);
    const text = await extractText(buffer, filename);

    let questions: ParsedPaperQuestion[];
    try {
      questions = await analyzePaperText(user.id, subjectId, year, filename, text.text);
    } catch (err) {
      if (err instanceof AiUnavailableError) throw err;
      throw new AiUnavailableError('Past paper analysis requires an AI provider to be enabled.');
    }
    if (questions.length === 0) throw new ValidationError('No questions could be extracted from this paper.');

    const paper = await store(user.id, filename, subjectId, year, questions);
    return reply.status(201).send({ success: true, data: toPaperDto(paper), message: `${questions.length} questions extracted`, error: null });
  });

  app.post('/api/past-papers/upload', { preHandler: authenticate, bodyLimit: MAX_UPLOAD_BYTES(), config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (request, reply) => {
    const { user } = request as any;
    const { filename, subjectId, year, buffer } = await paperInput(request);
    const text = await extractText(buffer, filename);
    let questions: ParsedPaperQuestion[];
    try {
      questions = await analyzePaperText(user.id, subjectId, year, filename, text.text);
    } catch (err) {
      if (err instanceof AiUnavailableError) throw err;
      throw new AiUnavailableError('Past paper analysis requires an AI provider to be enabled.');
    }
    if (questions.length === 0) throw new ValidationError('No questions could be extracted from this paper.');
    const paper = await store(user.id, filename, subjectId, year, questions);
    return reply.status(201).send({ success: true, data: toPaperDto(paper), message: 'Past paper uploaded and analyzed', error: null });
  });

  app.get('/api/past-papers', { preHandler: authenticate }, async (request, reply) => {
    const papers = await prisma.pastPaper.findMany({
      where: { userId: request.user!.id },
      orderBy: { createdAt: 'desc' },
    });
    return replyOk(reply, papers.map(toPaperDto));
  });

  app.get('/api/past-papers/:id', { preHandler: authenticate }, async (request, reply) => {
    const paper = await ownedPaper(request.user!.id, (request.params as { id: string }).id);
    return replyOk(reply, toPaperDto(paper));
  });

  app.get('/api/past-papers/:id/questions', { preHandler: authenticate }, async (request, reply) => {
    const paper = await ownedPaper(request.user!.id, (request.params as { id: string }).id);
    const questions = await prisma.pastPaperQuestion.findMany({
      where: { pastPaperId: paper.id },
      orderBy: { order: 'asc' },
    });
    return replyOk(
      reply,
      questions.map((q) => ({
        id: q.id,
        text: q.text,
        year: q.year,
        subjectId: q.subjectId,
        topicId: q.topicId ?? undefined,
        difficulty: q.difficulty,
        questionType: q.questionType,
        options: (q.options as Array<{ id: string; text: string }>) ?? undefined,
      }))
    );
  });

  app.post('/api/past-papers/:id/practice', { preHandler: authenticate }, async (request, reply) => {
    const paper = await ownedPaper(request.user!.id, (request.params as { id: string }).id);
    const questions = await prisma.pastPaperQuestion.findMany({
      where: { pastPaperId: paper.id },
      orderBy: { order: 'asc' },
      take: 15,
    });
    return replyOk(
      reply,
      questions.map((q) => ({
        id: q.id,
        text: q.text,
        year: q.year,
        questionType: q.questionType,
        difficulty: q.difficulty,
      }))
    );
  });
}

function toPaperDto(p: { id: string; name: string; subjectId: string; year: number; status: string; questionCount: number; errorMessage: string | null; createdAt: Date }) {
  return {
    id: p.id,
    name: p.name,
    subjectId: p.subjectId,
    year: p.year,
    status: p.status,
    questionCount: p.questionCount,
    errorMessage: p.errorMessage ?? undefined,
    uploadedAt: p.createdAt.toISOString(),
  };
}

async function ownedPaper(userId: string, paperId: string) {
  const paper = await prisma.pastPaper.findUnique({ where: { id: paperId } });
  if (!paper) throw new NotFoundError('Past paper not found');
  if (paper.userId !== userId) throw new ForbiddenError('Access denied');
  return paper;
}