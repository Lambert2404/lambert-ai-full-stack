import type { FastifyInstance } from 'fastify';
import { config } from '../config.js';
import { authenticate } from '../lib/auth.js';
import { UnavailableError, ValidationError } from '../lib/errors.js';
import { replyOk } from '../lib/envelope.js';
import { MAX_UPLOAD_BYTES } from '../services/documents.js';

/**
 * Voice backend. Forwards to the configured speech provider (e.g. Azure
 * Speech / an official provider). Secrets are never exposed. If a provider is
 * not configured, a controlled error is returned and the rest of the app keeps
 * working. (§26)
 */

export async function voiceRoutes(app: FastifyInstance) {
  app.post(
    '/api/voice/transcribe',
    { preHandler: authenticate, bodyLimit: MAX_UPLOAD_BYTES(), config: { rateLimit: { max: 20, timeWindow: '1 minute' } } },
    async (request, reply) => {
      if (!config.voice.transcribeUrl || !config.voice.transcribeKey) {
        throw new UnavailableError('VOICE_UNAVAILABLE', 'Speech transcription is not configured. Contact your administrator.');
      }
      const data = await (request as any).file({ limits: { fileSize: MAX_UPLOAD_BYTES(), files: 1 } });
      if (!data) throw new ValidationError('An audio file is required.');
      const buffers: Buffer[] = [];
      for await (const chunk of data.file) buffers.push(chunk as Buffer);
      const buffer = Buffer.concat(buffers);

      const res = await fetch(config.voice.transcribeUrl, {
        method: 'POST',
        headers: { 'Content-Type': data.mimetype ?? 'audio/wav', 'Ocp-Apim-Subscription-Key': config.voice.transcribeKey },
        body: buffer,
      });
      if (!res.ok) throw new UnavailableError('VOICE_ERROR', `Transcription provider returned ${res.status}.`);
      const json = (await safeJson(res)) as { text?: string; DisplayText?: string };
      const text = json?.text ?? json?.DisplayText ?? '';
      if (!text.trim()) throw new UnavailableError('VOICE_EMPTY', 'No transcript returned.');
      return replyOk(reply, { text });
    }
  );

  app.post(
    '/api/voice/synthesize',
    { preHandler: authenticate, config: { rateLimit: { max: 30, timeWindow: '1 minute' } } },
    async (request, reply) => {
    if (!config.voice.synthesizeUrl || !config.voice.synthesizeKey) {
      throw new UnavailableError('VOICE_UNAVAILABLE', 'Speech synthesis is not configured. Contact your administrator.');
    }
    const body = (request.body ?? {}) as { text?: string; voice?: string };
    if (!body.text?.trim()) throw new ValidationError('text is required.');

    const res = await fetch(config.voice.synthesizeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Ocp-Apim-Subscription-Key': config.voice.synthesizeKey },
      body: JSON.stringify({ text: body.text, voice: body.voice ?? 'en-US-JennyNeural' }),
    });
    if (!res.ok) throw new UnavailableError('VOICE_ERROR', `Synthesis provider returned ${res.status}.`);

    const contentType = res.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      const json = (await res.json()) as Record<string, unknown>;
      return replyOk(reply, json);
    }
    // Binary audio: persist privately and return a signed token.
    const audio = Buffer.from(await res.arrayBuffer());
    const { randomBytes } = await import('node:crypto');
    const token = randomBytes(8).toString('hex');
    const { mkdir, writeFile } = await import('node:fs/promises');
    const path = await import('node:path');
    const dir = path.resolve(process.cwd(), config.storageDir, 'audio');
    await mkdir(dir, { recursive: true });
    const file = path.join(dir, `${token}.mp3`);
    await writeFile(file, audio);
    return replyOk(reply, { audioUrl: `/api/voice/audio/${token}.mp3` });
  });

  // Authorized audio retrieval (no public storage paths exposed).
  app.get('/api/voice/audio/:file', { preHandler: authenticate }, async (request, reply) => {
    const { createReadStream } = await import('node:fs');
    const path = await import('node:path');
    const { file } = request.params as { file: string };
    if (!/^[a-f0-9]{16}\.mp3$/.test(file)) throw new ValidationError('Invalid audio file');
    const filePath = path.resolve(process.cwd(), config.storageDir, 'audio', file);
    return reply.type('audio/mpeg').send(createReadStream(filePath));
  });
}

async function safeJson(res: Response): Promise<unknown> {
  try {
    const json = await res.json();
    return json;
  } catch {
    return {};
  }
}