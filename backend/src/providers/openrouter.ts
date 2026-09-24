import OpenAI from 'openai';
import { config } from '../config.js';
import type { AIProviderClient, ProviderRequest, ProviderResult, ProviderStream } from './types.js';

export class OpenRouterProvider implements AIProviderClient {
  readonly code = 'openrouter' as const;
  readonly label = 'OpenRouter';

  private client: OpenAI | null = null;

  available(): boolean {
    return config.ai.openrouter.key.length > 0;
  }

  private getClient(): OpenAI {
    if (!this.client) {
      this.client = new OpenAI({
        apiKey: config.ai.openrouter.key,
        baseURL: config.ai.openrouter.baseUrl,
      });
    }
    return this.client;
  }

  private buildMessages(req: ProviderRequest) {
    return [
      { role: 'system' as const, content: req.system },
      ...req.messages.map((m) => ({ role: m.role, content: m.content })),
    ];
  }

  async generate(req: ProviderRequest, signal?: AbortSignal): Promise<ProviderResult> {
    const started = Date.now();
    const completion = await this.getClient().chat.completions.create(
      {
        model: req.model,
        messages: this.buildMessages(req),
        temperature: req.temperature ?? 0.7,
        max_tokens: req.maxTokens ?? 2048,
      },
      { signal }
    );
    const choice = completion.choices[0];
    const latencyMs = Date.now() - started;
    return {
      providerCode: this.code,
      model: completion.model ?? req.model,
      response: choice?.message?.content ?? '',
      inputTokens: completion.usage?.prompt_tokens,
      outputTokens: completion.usage?.completion_tokens,
      latencyMs,
    };
  }

  async *stream(req: ProviderRequest, signal?: AbortSignal): ProviderStream {
    const started = Date.now();
    const stream = await this.getClient().chat.completions.create(
      {
        model: req.model,
        messages: this.buildMessages(req),
        temperature: req.temperature ?? 0.7,
        max_tokens: req.maxTokens ?? 2048,
        stream: true,
      },
      { signal }
    );
    let full = '';
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content ?? '';
      if (delta) {
        full += delta;
        yield { delta };
      }
    }
    const latencyMs = Date.now() - started;
    return {
      providerCode: this.code,
      model: req.model,
      response: full,
      inputTokens: undefined,
      outputTokens: undefined,
      latencyMs,
    };
  }
}
