import { config } from '../config.js';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import type { ProviderCode, ProviderDefinition } from './types.js';

export interface ProviderDbRow {
  id: string;
  code: string;
  label: string;
  enabled: boolean;
  isDefault: boolean;
  isFallback: boolean;
  priority: number;
  config: unknown;
}

/**
 * Loads and caches provider definitions by merging:
 *  1. environment-provided capabilities (keys/endpoints send presence),
 *  2. admin-managed rows in the ai_providers table (enabled / default / fallback / model).
 * Never loads secrets from the DB.
 */

let cachedDefs: ProviderDefinition[] | null = null;

function defaultModelFor(code: ProviderCode): string {
  switch (code) {
    case 'openai':
      return config.ai.openai.model;
    case 'microsoft':
      return config.ai.microsoft.model;
    case 'google_gemini':
      return config.ai.gemini.model;
    case 'anthropic_claude':
      return config.ai.anthropic.model;
  }
}

function envHasCapability(code: string): boolean {
  switch (code) {
    case 'openai':
      return config.ai.openai.key.length > 0;
    case 'microsoft':
      return config.ai.microsoft.endpoint.length > 0 && config.ai.microsoft.key.length > 0;
    case 'google_gemini':
      return config.ai.gemini.key.length > 0;
    case 'anthropic_claude':
      return config.ai.anthropic.key.length > 0;
    default:
      return false;
  }
}

export async function loadProviderDefs(force = false): Promise<ProviderDefinition[]> {
  if (cachedDefs && !force) return cachedDefs;

  let rows: ProviderDbRow[] = [];
  try {
    rows = (await prisma.aiProvider.findMany({
      orderBy: [{ priority: 'asc' }, { code: 'asc' }],
    })) as unknown as ProviderDbRow[];
  } catch {
    logger.warn('ai providers table unavailable; using environment defaults');
  }

  const byCode = new Map(rows.map((r) => [r.code, r]));

  cachedDefs = (['openai', 'microsoft', 'google_gemini', 'anthropic_claude'] as ProviderCode[]).map((code) => {
    const row = byCode.get(code);
    const dbEnabled = row?.enabled;
    const caps = envHasCapability(code);
    // A provider is "enabled" only if the admin enabled it AND credentials exist.
    const enabled = dbEnabled === undefined ? caps : dbEnabled && caps;
    return {
      code,
      label: row?.label ?? defaultLabel(code),
      enabled,
      isDefault: row?.isDefault ?? code === 'openai',
      isFallback: row?.isFallback ?? true,
      priority: row?.priority ?? defaultPriority(code),
      model:
        ((row?.config && typeof row.config === 'object' && (row.config as Record<string, unknown>).model) as string | undefined) ||
        defaultModelFor(code),
    } satisfies ProviderDefinition;
  });

  return cachedDefs;
}

function defaultLabel(code: ProviderCode): string {
  switch (code) {
    case 'openai':
      return 'OpenAI';
    case 'microsoft':
      return 'Microsoft AI';
    case 'google_gemini':
      return 'Google Gemini';
    case 'anthropic_claude':
      return 'Anthropic Claude';
  }
}

function defaultPriority(code: ProviderCode): number {
  switch (code) {
    case 'openai':
      return 10;
    case 'microsoft':
      return 20;
    case 'google_gemini':
      return 30;
    case 'anthropic_claude':
      return 40;
  }
}

export function invalidateProviderCache(): void {
  cachedDefs = null;
}