import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { validateUpload, askDocument, parseJsonFromResponse, ingestMaterial } from '../src/services/documents.js';
import { ForbiddenError, ValidationError } from '../src/lib/errors.js';
import { chunkText, embedText, retrieveChunks } from '../src/lib/chunks.js';
import { prisma } from '../src/lib/prisma.js';
import type { AuthUser } from '../src/lib/auth.js';

let ownerUser: AuthUser;
let ownerId = '';

before(async () => {
  const created = await prisma.user.create({
    data: {
      email: `doc_owner_${Date.now()}@test.local`,
      name: 'Doc Owner',
      passwordHash: await bcrypt.hash('Password123', 4),
      role: 'student',
    },
  });
  ownerId = created.id;
  ownerUser = { id: created.id, email: created.email, name: created.name, role: 'student' };
});

after(async () => {
  if (!ownerId) return;
  await prisma.notification.deleteMany({ where: { userId: ownerId } });
  await prisma.studyActivity.deleteMany({ where: { userId: ownerId } });
  await prisma.user.delete({ where: { id: ownerId } });
});

test('validateUpload rejects unsupported extensions', () => {
  assert.throws(() => validateUpload('notes.exe', 100), ValidationError);
  assert.throws(() => validateUpload('notes', 100), ValidationError);
});

test('validateUpload rejects empty files', () => {
  assert.throws(() => validateUpload('notes.txt', 0), /empty/i);
});

test('validateUpload rejects oversized files', () => {
  assert.throws(() => validateUpload('notes.txt', 999999999), /too large/i);
});

test('validateUpload returns a storage key for supported types', () => {
  const { fileType, storageKey } = validateUpload('Unit 3 Notes.pdf', 1024);
  assert.equal(fileType, 'pdf');
  assert.ok(storageKey.length > 0);
});

test('parseJsonFromResponse strips fenced blocks', () => {
  const parsed = parseJsonFromResponse('```json\n{"questions":[{"prompt":"hi"}]}\n```');
  assert.deepEqual(parsed, { questions: [{ prompt: 'hi' }] });
});

test('parseJsonFromResponse extracts a balanced object from prose', () => {
  const parsed = parseJsonFromResponse('Sure! Here you go:\n{"a":1, "b":[2,3]}\nHope that helps.');
  assert.deepEqual(parsed, { a: 1, b: [2, 3] });
});

test('parseJsonFromResponse throws a VALIDATION_ERROR on garbage', () => {
  assert.throws(() => parseJsonFromResponse('not json at all'), ValidationError);
});

test('retrieveChunks ranks the relevant chunk first', () => {
  const text =
    'Plants use sunlight to make food. This process is called photosynthesis. Energy is stored in glucose. ' +
    'Chemistry covers reactions and the periodic table. Algebra deals with variables and equations.';
  const chunks = chunkText(text);
  const candidates = chunks.map((content, index) => ({
    id: `c${index}`,
    documentId: 'doc-t',
    index,
    content,
    embeddingJson: embedText(content),
  }));
  const ranked = retrieveChunks({ query: 'photosynthesis energy plants', candidates, k: 1, minScore: 0 });
  assert.ok(ranked.length === 1);
  assert.match(ranked[0]!.content, /photosynthesis/i);
});

test('ingest a plain-text file end to end (no AI) and enforce access', async () => {
  const content = 'Photosynthesis is the process plants use to convert sunlight into chemical energy stored in glucose.';
  let materialId = '';
  try {
    const material = await ingestMaterial({
      user: ownerUser,
      fileName: 'biology-notes.txt',
      buffer: Buffer.from(content, 'utf8'),
    });
    assert.ok(material);
    materialId = material.id;
    assert.equal(material.status, 'ready');
    assert.ok(material.document ? material.document.chunkCount > 0 : false);

    // Material access is owner-scoped.
    await assert.rejects(
      () =>
        askDocument({
          user: { id: 'someone-else', email: 'x@test.local', name: 'X', role: 'student' },
          documentId: material.document!.id,
          question: 'what is photosynthesis?',
        }),
      (err) => err instanceof ForbiddenError
    );
  } finally {
    if (materialId) {
      await prisma.documentChunk.deleteMany({ where: { document: { materialId } } });
      await prisma.document.deleteMany({ where: { materialId } });
      await prisma.studyMaterial.delete({ where: { id: materialId } });
    }
  }
});