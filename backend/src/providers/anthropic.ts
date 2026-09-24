import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config.js';
import type { AIProviderClient, ProviderRequest, ProviderResult, ProviderStream } from './types.js';

/**
 * Anthropic Claude via the official @anthropic-ai/sdk. §12
 * Uses the Messages API (Claude 3+ models).
 */
export class AnthropicProvider implements AIProviderClient {
  readonly code = 'anthropic_claude' as const;
  readonly label = 'Anthropic Claude';

  private client: Anthropic | null = null;

  available(): boolean {
    return config.ai.anthropic.key.length > 0;
  }

  private getClient(): Anthropic {
    if (!this.client) {
      this.client = new Anthropic({ apiKey: config.ai.anthropic.key });
    }
    return this.client;
  }

  async generate(req: ProviderRequest, signal?: AbortSignal): Promise<ProviderResult> {
    const started = Date.now();
    const msg = await this.getClient().messages.create(
      {
        model: req.model,
        max_tokens: req.maxTokens ?? 2048,
        temperature: req.temperature ?? 0.7,
        system: req.system,
        messages: req.messages.map((m) => ({ role: m.role, content: m.content })),
      },
      { signal }
    );
    return {
      providerCode: this.code,
      model: req.model,
      response: msg.content
        .filter((b): b is Extract<typeof b, { type: 'text' }> => b.type === 'text')
        .map((b) => b.text)
        .join(''),
      inputTokens: msg.usage?.input_tokens,
      outputTokens: msg.usage?.output_tokens,
      latencyMs: Date.now() - started,
    };
  }

  async *stream(req: ProviderRequest, signal?: AbortSignal): ProviderStream {
    const started = Date.now();
    const stream = await this.getClient().messages.stream(
      {
        model: req.model,
        max_tokens: req.maxTokens ?? 2048,
        temperature: req.temperature ?? 0.7,
        system: req.system,
        messages: req.messages.map((m) => ({ role: m.role, content: m.content })),
      },
      { signal }
    );
    let full = '';
    for await (const block of stream) {
      if (block.type === 'content_block_delta' && block.delta.type === 'text_delta') {
        const delta = block.delta.text;
        full += delta;
        yield { delta };
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