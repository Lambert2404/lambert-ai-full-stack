import type { AiTask, AiModeId } from '../lib/aiModes.js';

export type ProviderCode = 'openai' | 'microsoft' | 'google_gemini' | 'anthropic_claude';

export type AiProviderId = 'lambert_auto' | ProviderCode;

export interface ProviderMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ProviderRequest {
  providerCode: ProviderCode;
  model: string;
  system: string;
  messages: ProviderMessage[];
  temperature?: number;
  maxTokens?: number;
  task: AiTask;
  mode?: AiModeId;
}

export interface ProviderResult {
  providerCode: ProviderCode;
  model: string;
  response: string;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs: number;
  error?: string;
  stopped?: boolean;
}

/** Replaces stream chunks (delta) and yields the final ProviderResult at completion. */
export type ProviderStream = AsyncGenerator<{ delta: string }, ProviderResult, unknown>;

export interface AIProviderClient {
  readonly code: ProviderCode;
  readonly label: string;
  /** True when credentials/config for this provider are present. */
  available(): boolean;
  generate(req: ProviderRequest, signal?: AbortSignal): Promise<ProviderResult>;
  stream(req: ProviderRequest, signal?: AbortSignal): ProviderStream;
}

/** Standard, provider-normalized AI response handed to the frontend. (PDF §14) */
export interface StandardAIResponse {
  provider: ProviderCode;
  model: string;
  response: string;
  usage: { inputTokens?: number; outputTokens?: number };
  latency: number;
  citations: Array<{ documentId: string; documentName: string; pageNumber?: number; snippet: string }>;
  conversationId?: string;
  error?: string;
}

export interface ProviderDefinition {
  code: ProviderCode;
  label: string;
  enabled: boolean;
  isDefault: boolean;
  isFallback: boolean;
  priority: number;
  model: string;
}