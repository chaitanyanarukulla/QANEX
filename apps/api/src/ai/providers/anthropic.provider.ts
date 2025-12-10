import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { BaseAiProvider } from './base.provider';
import {
  ChatMessage,
  ChatCompletionOptions,
  ChatCompletionResult,
  EmbeddingOptions,
  EmbeddingResult,
  ConnectionTestResult,
  ModelInfo,
  ANTHROPIC_MODELS,
  ProviderType,
} from './ai-provider.types';

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AnthropicResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: Array<{
    type: 'text';
    text: string;
  }>;
  model: string;
  stop_reason: 'end_turn' | 'max_tokens' | 'stop_sequence';
  stop_sequence: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

/**
 * Anthropic Claude Provider
 * Supports Claude 3.5 Haiku, Claude Sonnet 4, and Claude Opus 4
 * Note: Anthropic doesn't provide embeddings - use OpenAI or local for RAG
 */
@Injectable()
export class AnthropicProvider extends BaseAiProvider {
  readonly providerType: ProviderType = 'anthropic';
  readonly providerName = 'Anthropic Claude';
  readonly supportsEmbeddings = false; // Anthropic doesn't have embeddings

  private readonly baseUrl = 'https://api.anthropic.com/v1';
  private readonly apiVersion = '2023-06-01';

  constructor(private readonly httpService: HttpService) {
    super('AnthropicProvider');
  }

  /**
   * Convert ChatMessage format to Anthropic format
   */
  private convertToAnthropicFormat(messages: ChatMessage[]): {
    messages: AnthropicMessage[];
    system?: string;
  } {
    const anthropicMessages: AnthropicMessage[] = [];
    let system: string | undefined;

    for (const msg of messages) {
      if (msg.role === 'system') {
        system = msg.content;
      } else {
        anthropicMessages.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        });
      }
    }

    return { messages: anthropicMessages, system };
  }

  /**
   * Chat completion with Claude models
   */
  async chat(
    messages: ChatMessage[],
    options?: ChatCompletionOptions,
    apiKey?: string,
  ): Promise<ChatCompletionResult> {
    const key = apiKey || process.env.ANTHROPIC_API_KEY;

    if (!key) {
      throw new Error('Anthropic API key not configured');
    }

    const model = options?.model || 'claude-3-5-haiku-20241022';
    const url = `${this.baseUrl}/messages`;

    const { messages: anthropicMessages, system } =
      this.convertToAnthropicFormat(messages);

    // Merge system prompt from options if provided
    const finalSystem = options?.systemPrompt || system;

    const payload: Record<string, unknown> = {
      model,
      messages: anthropicMessages,
      max_tokens: options?.maxTokens ?? 1000,
    };

    if (finalSystem) {
      payload.system = finalSystem;
    }

    // Note: Anthropic doesn't support temperature for all models
    if (options?.temperature !== undefined) {
      payload.temperature = options.temperature;
    }

    try {
      const startTime = Date.now();

      const response = await firstValueFrom(
        this.httpService.post<AnthropicResponse>(url, payload, {
          headers: {
            'x-api-key': key,
            'anthropic-version': this.apiVersion,
            'Content-Type': 'application/json',
          },
          timeout: 60000,
        }),
      );

      const latency = Date.now() - startTime;
      this.logger.debug(`Anthropic chat completed in ${latency}ms`);

      const data = response.data;
      const content =
        data.content.find((c) => c.type === 'text')?.text || '';

      return {
        content,
        model: data.model,
        usage: {
          promptTokens: data.usage.input_tokens,
          completionTokens: data.usage.output_tokens,
          totalTokens: data.usage.input_tokens + data.usage.output_tokens,
        },
        finishReason: this.mapStopReason(data.stop_reason),
      };
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error?.message || error.message;
      this.logger.error(`Anthropic chat failed: ${errorMessage}`);
      throw new Error(`Anthropic API error: ${errorMessage}`);
    }
  }

  /**
   * Embeddings not supported by Anthropic
   * This will throw an error - use OpenAI or local provider for embeddings
   */
  async embed(
    _texts: string[],
    _options?: EmbeddingOptions,
  ): Promise<EmbeddingResult> {
    throw new Error(
      'Anthropic does not support embeddings. Use OpenAI or Foundry Local for RAG embeddings.',
    );
  }

  /**
   * Test connection to Anthropic API
   */
  async testConnection(apiKey?: string): Promise<ConnectionTestResult> {
    const key = apiKey || process.env.ANTHROPIC_API_KEY;

    if (!key) {
      return {
        success: false,
        message: 'Anthropic API key not configured',
      };
    }

    try {
      const startTime = Date.now();

      // Anthropic doesn't have a models list endpoint, so we do a minimal chat
      const response = await firstValueFrom(
        this.httpService.post<AnthropicResponse>(
          `${this.baseUrl}/messages`,
          {
            model: 'claude-3-5-haiku-20241022',
            max_tokens: 10,
            messages: [{ role: 'user', content: 'Hi' }],
          },
          {
            headers: {
              'x-api-key': key,
              'anthropic-version': this.apiVersion,
              'Content-Type': 'application/json',
            },
            timeout: 15000,
          },
        ),
      );

      const latency = Date.now() - startTime;

      return {
        success: true,
        message: 'Connected to Anthropic API successfully',
        latencyMs: latency,
        modelInfo: {
          id: response.data.model,
          name: 'Claude 3.5 Haiku',
        },
      };
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error?.message || error.message;

      if (
        error.response?.status === 401 ||
        error.response?.status === 403
      ) {
        return {
          success: false,
          message: 'Invalid API key or insufficient permissions',
        };
      }

      return {
        success: false,
        message: `Connection failed: ${errorMessage}`,
      };
    }
  }

  /**
   * Get available Anthropic models
   */
  getAvailableModels(): ModelInfo[] {
    return ANTHROPIC_MODELS;
  }

  /**
   * Map Anthropic stop reason to standard format
   */
  private mapStopReason(
    reason?: string,
  ): 'stop' | 'length' | 'content_filter' | undefined {
    switch (reason) {
      case 'end_turn':
      case 'stop_sequence':
        return 'stop';
      case 'max_tokens':
        return 'length';
      default:
        return undefined;
    }
  }

  /**
   * Chat with API key parameter (for tenant-specific keys)
   */
  async chatWithKey(
    messages: ChatMessage[],
    apiKey: string,
    options?: ChatCompletionOptions,
  ): Promise<ChatCompletionResult> {
    return this.chat(messages, options, apiKey);
  }
}
