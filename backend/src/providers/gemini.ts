import { config } from '../config.js';
import type { AIProviderClient, ProviderRequest, ProviderResult, ProviderStream } from './types.js';

const API_VERSION = 'v1beta';

/**
 * Google Gemini via the official Google AI REST API
 * (generativelanguage.googleapis.com). §11
 */

export class GeminiProvider implements AIProviderClient {
  readonly code = 'google_gemini' as const;
  readonly label = 'Google Gemini';

  available(): boolean {
    return config.ai.gemini.key.length > 0;
  }

  private url(model: string, streaming: boolean): string {
    const action = streaming ? 'streamGenerateContent' : 'generateContent';
    const alt = streaming ? '&alt=sse' : '';
    return `https://generativelanguage.googleapis.com/${API_VERSION}/models/${encodeURIComponent(model)}:${action}?key=${encodeURIComponent(config.ai.gemini.key)}${alt}`;
  }

  private body(req: ProviderRequest) {
    const contents = [
      { role: 'user', parts: [{ text: req.system }] },
      ...req.messages,
    ];
    return JSON.stringify({
      contents,
      generationConfig: {
        temperature: req.temperature ?? 0.7,
        maxOutputTokens: req.maxTokens ?? 2048,
      },
    });
  }

  private extractText(json: unknown): string {
    if (!json || typeof json !== 'object') return '';
    const candidates = (json as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }).candidates ?? [];
    return candidates
      .map((c) => (c.content?.parts ?? []).map((p) => p.text ?? '').join(''))
      .join('');
  }

  async generate(req: ProviderRequest, signal?: AbortSignal): Promise<ProviderResult> {
    const started = Date.now();
    const res = await fetch(this.url(req.model, false), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: this.body(req),
      signal,
    });
    if (!res.ok) {
      const detail = await safeText(res);
      throw new Error(`Gemini request failed (${res.status}): ${detail}`);
    }
    const json = await res.json();
    return {
      providerCode: this.code,
      model: req.model,
      response: this.extractText(json),
      latencyMs: Date.now() - started,
    };
  }

  async *stream(req: ProviderRequest, signal?: AbortSignal): ProviderStream {
    const started = Date.now();
    const res = await fetch(this.url(req.model, true), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: this.body(req),
      signal,
    });
    if (!res.ok) {
      const detail = await safeText(res);
      throw new Error(`Gemini stream failed (${res.status}): ${detail}`);
    }
    if (!res.body) throw new Error('Gemini returned an empty stream');
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let full = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split('\n\n');
      buffer = events.pop() ?? '';
      for (const event of events) {
        const dataLine = event.split('\n').find((l) => l.startsWith('data:'));
        if (!dataLine) continue;
        const payload = dataLine.slice(5).trim();
        if (!payload) continue;
        try {
          const json = JSON.parse(payload) as {
            candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
          };
          const delta = (json.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? '').join('');
          if (delta) {
            full += delta;
            yield { delta };
          }
        } catch {
          // ignore
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