import { config } from '../config.js';
import { prisma } from '../lib/prisma.js';
import { AiUnavailableError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import type { AiModeId, AiTask } from '../lib/aiModes.js';
import type { ProviderCode, ProviderDefinition, ProviderMessage, ProviderResult, ProviderStream, AiProviderId } from './types.js';
import { loadProviderDefs, invalidateProviderCache } from './registry.js';
import { OpenAIProvider } from './openai.js';
import { MicrosoftAIProvider } from './microsoft.js';
import { GeminiProvider } from './gemini.js';
import { AnthropicProvider } from './anthropic.js';
import { OpenRouterProvider } from './openrouter.js';

export { invalidateProviderCache };

export interface RouteRequest {
  task: AiTask;
  providerCode?: AiProviderId;
  mode?: AiModeId;
  system?: string;
  messages: ProviderMessage[];
  userId?: string;
  fallback?: boolean;
  temperature?: number;
  maxTokens?: number;
  conversationId?: string;
  citations?: Array<{ documentId: string; documentName: string; pageNumber?: number; snippet: string }>;
}

export interface RoutedResult extends ProviderResult {
  definition: { code: ProviderCode; label: string; model: string };
}

const clients = new Map<ProviderCode, { code: ProviderCode; label: string; available: () => boolean; generate: (req: any, signal: any) => Promise<ProviderResult>; stream: (req: any, signal: any) => ProviderStream }>();
clients.set('openai', new OpenAIProvider() as any);
clients.set('microsoft', new MicrosoftAIProvider() as any);
clients.set('google_gemini', new GeminiProvider() as any);
clients.set('anthropic_claude', new AnthropicProvider() as any);
clients.set('openrouter', new OpenRouterProvider() as any);

function fallbackAllowed(req: RouteRequest): boolean {
  return req.fallback !== false && config.ai.fallbackEnabled;
}

async function resolveCandidates(req: RouteRequest): Promise<ProviderDefinition[]> {
  const defs = await loadProviderDefs();
  const enabled = defs.filter((d) => d.enabled);

  if (req.providerCode && req.providerCode !== 'lambert_auto') {
    const chosen = enabled.find((d) => d.code === req.providerCode);
    if (!chosen) {
      throw new AiUnavailableError(
        'The selected AI provider is disabled or not configured. Choose another provider or contact your administrator.'
      );
    }
    return [chosen];
  }

  if (enabled.length === 0) {
    throw new AiUnavailableError(
      'No AI provider is enabled. Ask an administrator to configure a provider in Settings.'
    );
  }

  const sorted = [...enabled].sort((a, b) => {
    if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.code.localeCompare(b.code);
  });

  if (!fallbackAllowed(req)) {
    // Only the default/first provider - no fallback.
    return [sorted[0]!];
  }
  return sorted;
}

async function recordUsage(
  def: ProviderDefinition,
  req: RouteRequest,
  result: { inputTokens?: number; outputTokens?: number; latencyMs?: number },
  status: 'success' | 'error',
  errorCategory?: string
): Promise<void> {
  try {
    await prisma.aiUsage.create({
      data: {
        userId: req.userId ?? null,
        providerCode: def.code,
        taskType: req.task,
        requestCount: 1,
        inputTokens: result.inputTokens ?? null,
        outputTokens: result.outputTokens ?? null,
        latencyMs: result.latencyMs ?? null,
        status,
        errorCategory,
      },
    });
  } catch (err) {
    logger.warn({ err }, 'failed to record ai usage');
  }
}

export async function routeGenerate(req: RouteRequest, signal?: AbortSignal): Promise<RoutedResult> {
  const candidates = await resolveCandidates(req);
  const errors: string[] = [];

  for (const def of candidates) {
    const client = clients.get(def.code);
    if (!client) continue;
    try {
      const start = Date.now();
      const result = await client.generate(
        {
          providerCode: def.code,
          model: def.model,
          system: req.system ?? '',
          messages: req.messages,
          temperature: req.temperature,
          maxTokens: req.maxTokens,
          task: req.task,
          mode: req.mode,
        },
        signal
      );
      result.latencyMs = Date.now() - start;
      if (!result.response || !result.response.trim()) {
        throw new Error('provider returned an empty response');
      }
      await recordUsage(def, req, result, 'success');
      return { ...result, definition: { code: def.code, label: def.label, model: def.model } };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${def.label}: ${msg}`);
      await recordUsage(def, req, { latencyMs: 0 }, 'error', 'provider_error');
    }
  }

  throw new AiUnavailableError(`All AI providers failed. ${errors.join(' | ')}`);
}

export async function* routeStream(req: RouteRequest, signal?: AbortSignal): ProviderStream {
  const candidates = await resolveCandidates(req);
  const errors: string[] = [];

  for (const def of candidates) {
    const client = clients.get(def.code);
    if (!client) continue;
    let receivedAny = false;
    try {
      const start = Date.now();
      const inner = client.stream(
        {
          providerCode: def.code,
          model: def.model,
          system: req.system ?? '',
          messages: req.messages,
          temperature: req.temperature,
          maxTokens: req.maxTokens,
          task: req.task,
          mode: req.mode,
        },
        signal
      );
      while (true) {
        const { done, value } = await inner.next();
        if (done) {
          const sized =
            value ?? { response: '', latencyMs: Date.now() - start, providerCode: def.code, model: def.model, inputTokens: undefined, outputTokens: undefined };
          const result = sized as ProviderResult;
          if (!result.response?.trim() && !receivedAny) {
            throw new Error('provider returned an empty response');
          }
          await recordUsage(def, req, result, 'success');
          return result;
        }
        receivedAny = true;
        yield value as { delta: string };
      }
    } catch (err) {
      if (receivedAny) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(`Stream failed mid-generation on ${def.label}: ${msg}`);
      }
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${def.label}: ${msg}`);
      await recordUsage(def, req, { latencyMs: 0 }, 'error', 'provider_error');
    }
  }
  throw new AiUnavailableError(`All AI providers failed. ${errors.join(' | ')}`);
}