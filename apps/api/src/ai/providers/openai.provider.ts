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
  OPENAI_MODELS,
  ProviderType,
} from './ai-provider.types';

interface OpenAIChatResponse {
  id: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
}

interface OpenAIEmbeddingResponse {
  data: Array<{
    embedding: number[];
    index: number;
  }>;
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

/**
 * OpenAI Provider
 * Supports GPT-4, GPT-4o, GPT-4o-mini, and embedding models
 */
@Injectable()
export class OpenAIProvider extends BaseAiProvider {
  readonly providerType: ProviderType = 'openai';
  readonly providerName = 'OpenAI';
  readonly supportsEmbeddings = true;

  private readonly baseUrl = 'https://api.openai.com/v1';

  constructor(private readonly httpService: HttpService) {
    super('OpenAIProvider');
  }

  /**
   * Chat completion with OpenAI models
   */
  async chat(
    messages: ChatMessage[],
    options?: ChatCompletionOptions,
    apiKey?: string,
  ): Promise<ChatCompletionResult> {
    const key = apiKey || process.env.OPENAI_API_KEY;

    if (!key) {
      throw new Error('OpenAI API key not configured');
    }

    const model = options?.model || 'gpt-4o-mini';
    const url = `${this.baseUrl}/chat/completions`;

    const payload: Record<string, unknown> = {
      model,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 1000,
    };

    if (options?.responseFormat === 'json') {
      payload.response_format = { type: 'json_object' };
    }

    try {
      const startTime = Date.now();

      const response = await firstValueFrom(
        this.httpService.post<OpenAIChatResponse>(url, payload, {
          headers: {
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json',
          },
          timeout: 120000,
        }),
      );

      const latency = Date.now() - startTime;
      this.logger.debug(`OpenAI chat completed in ${latency}ms`);

      const data = response.data;
      const content = data.choices[0]?.message?.content || '';

      return {
        content,
        model: data.model,
        usage: data.usage
          ? {
              promptTokens: data.usage.prompt_tokens,
              completionTokens: data.usage.completion_tokens,
              totalTokens: data.usage.total_tokens,
            }
          : undefined,
        finishReason: data.choices[0]?.finish_reason as
          | 'stop'
          | 'length'
          | 'content_filter',
      };
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error?.message || error.message;
      this.logger.error(`OpenAI chat failed: ${errorMessage}`);
      throw new Error(`OpenAI API error: ${errorMessage}`);
    }
  }

  /**
   * Generate embeddings with OpenAI
   */
  async embed(
    texts: string[],
    options?: EmbeddingOptions,
    apiKey?: string,
  ): Promise<EmbeddingResult> {
    const key = apiKey || process.env.OPENAI_API_KEY;

    if (!key) {
      throw new Error('OpenAI API key not configured');
    }

    const model = options?.model || 'text-embedding-3-small';
    const url = `${this.baseUrl}/embeddings`;

    try {
      const response = await firstValueFrom(
        this.httpService.post<OpenAIEmbeddingResponse>(
          url,
          {
            model,
            input: texts,
          },
          {
            headers: {
              Authorization: `Bearer ${key}`,
              'Content-Type': 'application/json',
            },
            timeout: 30000,
          },
        ),
      );

      const data = response.data;
      const embeddings = data.data
        .sort((a, b) => a.index - b.index)
        .map((item) => item.embedding);

      // Determine dimensions from first embedding
      const dimensions = embeddings[0]?.length || 1536;

      return {
        embeddings,
        model: data.model,
        dimensions,
        usage: {
          totalTokens: data.usage.total_tokens,
        },
      };
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error?.message || error.message;
      this.logger.error(`OpenAI embedding failed: ${errorMessage}`);
      throw new Error(`OpenAI embedding error: ${errorMessage}`);
    }
  }

  /**
   * Test connection to OpenAI API
   */
  async testConnection(apiKey?: string): Promise<ConnectionTestResult> {
    const key = apiKey || process.env.OPENAI_API_KEY;

    if (!key) {
      return {
        success: false,
        message: 'OpenAI API key not configured',
      };
    }

    try {
      const startTime = Date.now();

      // Use a simple model list call to test
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/models`, {
          headers: {
            Authorization: `Bearer ${key}`,
          },
          timeout: 10000,
        }),
      );

      const latency = Date.now() - startTime;

      // Check if gpt-4o-mini is available (common model)
      const models = response.data.data || [];
      const hasGpt4oMini = models.some(
        (m: { id: string }) => m.id === 'gpt-4o-mini',
      );

      return {
        success: true,
        message: hasGpt4oMini
          ? 'Connected to OpenAI API successfully'
          : 'Connected to OpenAI API (some models may be restricted)',
        latencyMs: latency,
        modelInfo: {
          id: 'gpt-4o-mini',
          name: 'GPT-4o Mini',
        },
      };
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error?.message || error.message;

      if (error.response?.status === 401) {
        return {
          success: false,
          message: 'Invalid API key',
        };
      }

      return {
        success: false,
        message: `Connection failed: ${errorMessage}`,
      };
    }
  }

  /**
   * Get available OpenAI models
   */
  getAvailableModels(): ModelInfo[] {
    return OPENAI_MODELS;
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

  /**
   * Embed with API key parameter
   */
  async embedWithKey(
    texts: string[],
    apiKey: string,
    options?: EmbeddingOptions,
  ): Promise<EmbeddingResult> {
    return this.embed(texts, options, apiKey);
  }
}
