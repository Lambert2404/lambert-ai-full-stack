import { config } from '../config.js';
import type { AIProviderClient, ProviderRequest, ProviderResult, ProviderStream } from './types.js';

/**
 * Microsoft AI via the officially supported Azure OpenAI interface.
 * Uses the chat completions API surface (OpenAI-compatible) that Azure exposes
 * for deployed models. Provider is gracefully disabled when credentials are
 * absent; the rest of the application keeps working. (§10)
 */

function normalizeEndpoint(endpoint: string, model: string): string {
  const base = endpoint.trim().replace(/\/+$/, '');
  if (base.includes('/chat/completions')) {
    return `${base}?api-version=2024-10-21`;
  }
  return `${base}/openai/deployments/${encodeURIComponent(model)}/chat/completions?api-version=2024-10-21`;
}

export class MicrosoftAIProvider implements AIProviderClient {
  readonly code = 'microsoft' as const;
  readonly label = 'Microsoft AI';

  available(): boolean {
    return config.ai.microsoft.endpoint.length > 0 && config.ai.microsoft.key.length > 0;
  }

  private headers() {
    return {
      'Content-Type': 'application/json',
      'api-key': config.ai.microsoft.key,
    };
  }

  private body(req: ProviderRequest, stream: boolean) {
    return JSON.stringify({
      messages: [{ role: 'system', content: req.system }, ...req.messages],
      temperature: req.temperature ?? 0.7,
      max_tokens: req.maxTokens ?? 2048,
      stream,
    });
  }

  private async post(req: ProviderRequest, stream: boolean, signal?: AbortSignal): Promise<Response> {
    const url = normalizeEndpoint(config.ai.microsoft.endpoint, req.model);
    return fetch(url, {
      method: 'POST',
      headers: this.headers(),
      body: this.body(req, stream),
      signal,
    });
  }

  async generate(req: ProviderRequest, signal?: AbortSignal): Promise<ProviderResult> {
    const started = Date.now();
    const res = await this.post(req, false, signal);
    if (!res.ok) {
      const detail = await safeText(res);
      throw new Error(`Microsoft AI request failed (${res.status}): ${detail}`);
    }
    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    return {
      providerCode: this.code,
      model: req.model,
      response: json.choices?.[0]?.message?.content ?? '',
      inputTokens: json.usage?.prompt_tokens,
      outputTokens: json.usage?.completion_tokens,
      latencyMs: Date.now() - started,
    };
  }

  async *stream(req: ProviderRequest, signal?: AbortSignal): ProviderStream {
    const started = Date.now();
    const res = await this.post(req, true, signal);
    if (!res.ok) {
      const detail = await safeText(res);
      throw new Error(`Microsoft AI stream failed (${res.status}): ${detail}`);
    }
    if (!res.body) throw new Error('Microsoft AI returned an empty stream');
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let full = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const payload = trimmed.slice(5).trim();
        if (!payload || payload === '[DONE]') continue;
        try {
          const json = JSON.parse(payload) as { choices?: Array<{ delta?: { content?: string } }> };
          const delta = json.choices?.[0]?.delta?.content ?? '';
          if (delta) {
            full += delta;
            yield { delta };
          }
        } catch {
          // ignore partial JSON lines
        }
      }
    }
    return {
      providerCode: this.code,
      model: req.model,
      response: full,
      latencyMs: Date.now() - started,
    };
  }
}

async function safeText(res: Response): Promise<string> {
  try {
    return (await res.text()).slice(0, 300);
  } catch {
    return 'no details';
  }
}