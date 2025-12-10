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
  GEMINI_MODELS,
  ProviderType,
} from './ai-provider.types';

interface GeminiContent {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
      role: string;
    };
    finishReason: string;
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
  modelVersion?: string;
}

interface GeminiEmbeddingResponse {
  embedding: {
    values: number[];
  };
}

interface GeminiBatchEmbeddingResponse {
  embeddings: Array<{
    values: number[];
  }>;
}

/**
 * Google Gemini Provider
 * Supports Gemini 1.5 Pro, Gemini 1.5 Flash, and embedding models
 */
@Injectable()
export class GeminiProvider extends BaseAiProvider {
  readonly providerType: ProviderType = 'gemini';
  readonly providerName = 'Google Gemini';
  readonly supportsEmbeddings = true;

  private readonly baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  constructor(private readonly httpService: HttpService) {
    super('GeminiProvider');
  }

  /**
   * Convert ChatMessage format to Gemini content format
   */
  private convertToGeminiFormat(messages: ChatMessage[]): {
    contents: GeminiContent[];
    systemInstruction?: { parts: Array<{ text: string }> };
  } {
    const contents: GeminiContent[] = [];
    let systemInstruction: { parts: Array<{ text: string }> } | undefined;

    for (const msg of messages) {
      if (msg.role === 'system') {
        // Gemini uses systemInstruction separately
        systemInstruction = {
          parts: [{ text: msg.content }],
        };
      } else {
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }],
        });
      }
    }

    return { contents, systemInstruction };
  }

  /**
   * Chat completion with Gemini models
   */
  async chat(
    messages: ChatMessage[],
    options?: ChatCompletionOptions,
    apiKey?: string,
  ): Promise<ChatCompletionResult> {
    const key = apiKey || process.env.GEMINI_API_KEY;

    if (!key) {
      throw new Error('Gemini API key not configured');
    }

    const model = options?.model || 'gemini-1.5-flash';
    const url = `${this.baseUrl}/models/${model}:generateContent?key=${key}`;

    const { contents, systemInstruction } = this.convertToGeminiFormat(messages);

    const payload: Record<string, unknown> = {
      contents,
      generationConfig: {
        temperature: options?.temperature ?? 0.7,
        maxOutputTokens: options?.maxTokens ?? 1000,
      },
    };

    if (systemInstruction) {
      payload.systemInstruction = systemInstruction;
    }

    if (options?.responseFormat === 'json') {
      payload.generationConfig = {
        ...(payload.generationConfig as object),
        responseMimeType: 'application/json',
      };
    }

    try {
      const startTime = Date.now();

      const response = await firstValueFrom(
        this.httpService.post<GeminiResponse>(url, payload, {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 60000,
        }),
      );

      const latency = Date.now() - startTime;
      this.logger.debug(`Gemini chat completed in ${latency}ms`);

      const data = response.data;
      const content = data.candidates[0]?.content?.parts[0]?.text || '';

      return {
        content,
        model,
        usage: data.usageMetadata
          ? {
              promptTokens: data.usageMetadata.promptTokenCount,
              completionTokens: data.usageMetadata.candidatesTokenCount,
              totalTokens: data.usageMetadata.totalTokenCount,
            }
          : undefined,
        finishReason: this.mapFinishReason(data.candidates[0]?.finishReason),
      };
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error?.message || error.message;
      this.logger.error(`Gemini chat failed: ${errorMessage}`);
      throw new Error(`Gemini API error: ${errorMessage}`);
    }
  }

  /**
   * Generate embeddings with Gemini
   */
  async embed(
    texts: string[],
    options?: EmbeddingOptions,
    apiKey?: string,
  ): Promise<EmbeddingResult> {
    const key = apiKey || process.env.GEMINI_API_KEY;

    if (!key) {
      throw new Error('Gemini API key not configured');
    }

    const model = options?.model || 'text-embedding-004';

    try {
      // Gemini supports batch embedding
      if (texts.length === 1) {
        return this.embedSingle(texts[0], model, key);
      }

      return this.embedBatch(texts, model, key);
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error?.message || error.message;
      this.logger.error(`Gemini embedding failed: ${errorMessage}`);
      throw new Error(`Gemini embedding error: ${errorMessage}`);
    }
  }

  /**
   * Embed a single text
   */
  private async embedSingle(
    text: string,
    model: string,
    apiKey: string,
  ): Promise<EmbeddingResult> {
    const url = `${this.baseUrl}/models/${model}:embedContent?key=${apiKey}`;

    const response = await firstValueFrom(
      this.httpService.post<GeminiEmbeddingResponse>(
        url,
        {
          model: `models/${model}`,
          content: {
            parts: [{ text }],
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        },
      ),
    );

    const embedding = response.data.embedding.values;

    return {
      embeddings: [embedding],
      model,
      dimensions: embedding.length,
    };
  }

  /**
   * Embed multiple texts in batch
   */
  private async embedBatch(
    texts: string[],
    model: string,
    apiKey: string,
  ): Promise<EmbeddingResult> {
    const url = `${this.baseUrl}/models/${model}:batchEmbedContents?key=${apiKey}`;

    const requests = texts.map((text) => ({
      model: `models/${model}`,
      content: {
        parts: [{ text }],
      },
    }));

    const response = await firstValueFrom(
      this.httpService.post<GeminiBatchEmbeddingResponse>(
        url,
        { requests },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 60000,
        },
      ),
    );

    const embeddings = response.data.embeddings.map((e) => e.values);
    const dimensions = embeddings[0]?.length || 768;

    return {
      embeddings,
      model,
      dimensions,
    };
  }

  /**
   * Test connection to Gemini API
   */
  async testConnection(apiKey?: string): Promise<ConnectionTestResult> {
    const key = apiKey || process.env.GEMINI_API_KEY;

    if (!key) {
      return {
        success: false,
        message: 'Gemini API key not configured',
      };
    }

    try {
      const startTime = Date.now();

      // Use models list endpoint to test
      const url = `${this.baseUrl}/models?key=${key}`;

      const response = await firstValueFrom(
        this.httpService.get(url, {
          timeout: 10000,
        }),
      );

      const latency = Date.now() - startTime;

      const models = response.data.models || [];
      const hasFlash = models.some(
        (m: { name: string }) =>
          m.name.includes('gemini-1.5-flash') || m.name.includes('gemini-2.0'),
      );

      return {
        success: true,
        message: hasFlash
          ? 'Connected to Gemini API successfully'
          : 'Connected to Gemini API (checking model availability)',
        latencyMs: latency,
        modelInfo: {
          id: 'gemini-1.5-flash',
          name: 'Gemini 1.5 Flash',
        },
      };
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error?.message || error.message;

      if (error.response?.status === 400 || error.response?.status === 403) {
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
   * Get available Gemini models
   */
  getAvailableModels(): ModelInfo[] {
    return GEMINI_MODELS;
  }

  /**
   * Map Gemini finish reason to standard format
   */
  private mapFinishReason(
    reason?: string,
  ): 'stop' | 'length' | 'content_filter' | undefined {
    switch (reason) {
      case 'STOP':
        return 'stop';
      case 'MAX_TOKENS':
        return 'length';
      case 'SAFETY':
      case 'RECITATION':
        return 'content_filter';
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
