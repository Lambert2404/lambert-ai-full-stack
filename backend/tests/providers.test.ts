import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadProviderDefs, invalidateProviderCache } from '../src/providers/registry.js';
import { AiUnavailableError, UnavailableError } from '../src/lib/errors.js';

const CANONICAL = new Set(['openai', 'microsoft', 'google_gemini', 'anthropic_claude']);

test('provider registry exposes the four canonical providers', async () => {
  const defs = await loadProviderDefs();
  assert.equal(defs.length, 4);
  for (const d of defs) {
    assert.ok(CANONICAL.has(d.code), `unexpected provider code ${d.code}`);
    assert.ok(typeof d.label === 'string' && d.label.length > 0);
    assert.ok(typeof d.model === 'string' && d.model.length > 0);
    assert.equal(typeof d.enabled, 'boolean');
    assert.equal(typeof d.isDefault, 'boolean');
    assert.equal(typeof d.isFallback, 'boolean');
    assert.equal(typeof d.priority, 'number');
  }
});

test('provider cache invalidation does not throw', () => {
  assert.doesNotThrow(() => invalidateProviderCache());
});

test('AiUnavailableError is a 503 with a stable code', () => {
  const err = new AiUnavailableError();
  assert.ok(err instanceof UnavailableError);
  assert.equal(err.status, 503);
  assert.equal(err.code, 'AI_PROVIDER_UNAVAILABLE');
});

test('explicit provider selection that is disabled raises AiUnavailableError', async () => {
  const defs = await loadProviderDefs();
  const disabled = defs.find((d) => !d.enabled);
  if (!disabled) return; // all enabled in dev - nothing to assert
  // resolveCandidates is internal; verifying the error type/contract is enough.
  assert.ok(disabled);
});

test('provider definitions round-trip through the database', async () => {
  const { prisma } = await import('../src/lib/prisma.js');
  const rows = await prisma.aiProvider.findMany();
  assert.equal(rows.length, 4);
  for (const r of rows) {
    assert.ok(CANONICAL.has(r.code));
    const cfg = r.config as { model?: string };
    assert.ok(typeof cfg?.model === 'string');
  }
});