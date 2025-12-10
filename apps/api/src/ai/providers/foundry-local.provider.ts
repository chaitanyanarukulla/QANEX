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
  FoundryLocalModelInfo,
  FoundryModelInfo,
  FoundryServiceStatus,
  FOUNDRY_LOCAL_MODELS,
  ProviderType,
} from './ai-provider.types';

/**
 * OpenAI-compatible response from Foundry Local
 */
interface FoundryLocalChatResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
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
}

interface FoundryLocalEmbeddingResponse {
  object: 'list';
  data: Array<{
    object: 'embedding';
    embedding: number[];
    index: number;
  }>;
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

interface FoundryLocalModelsResponse {
  data: FoundryModelInfo[];
}

/**
 * Microsoft Foundry Local Provider
 * Runs AI models on-device with OpenAI-compatible API
 *
 * Key features:
 * - 100% local inference - no data leaves the device
 * - OpenAI-compatible REST API
 * - Automatic hardware optimization (CPU, GPU, NPU)
 * - Multiple model support (Phi, Qwen, Llama, Mistral, etc.)
 *
 * @see https://github.com/microsoft/Foundry-Local
 * @see https://learn.microsoft.com/en-us/azure/ai-foundry/foundry-local/
 */
@Injectable()
export class FoundryLocalProvider extends BaseAiProvider {
  readonly providerType: ProviderType = 'foundry_local';
  readonly providerName = 'Foundry Local';
  readonly supportsEmbeddings = true;

  // Default Foundry Local endpoint
  private readonly defaultEndpoint = 'http://127.0.0.1:55588/v1';

  constructor(private readonly httpService: HttpService) {
    super('FoundryLocalProvider');
  }

  /**
   * Get the endpoint URL (from config or default)
   */
  private getEndpoint(customEndpoint?: string): string {
    return (
      customEndpoint ||
      process.env.FOUNDRY_LOCAL_ENDPOINT ||
      this.defaultEndpoint
    );
  }

  /**
   * Chat completion using Foundry Local (OpenAI-compatible)
   */
  async chat(
    messages: ChatMessage[],
    options?: ChatCompletionOptions & { endpoint?: string },
  ): Promise<ChatCompletionResult> {
    const endpoint = this.getEndpoint(options?.endpoint);
    const model =
      options?.model || process.env.FOUNDRY_LOCAL_MODEL || 'phi-3.5-mini';
    const url = `${endpoint}/chat/completions`;

    const payload: Record<string, unknown> = {
      model,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 1000,
      stream: false,
    };

    try {
      const startTime = Date.now();

      const response = await firstValueFrom(
        this.httpService.post<FoundryLocalChatResponse>(url, payload, {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 120000, // Local models can be slower, give more time
        }),
      );

      const latency = Date.now() - startTime;
      this.logger.debug(`Foundry Local chat completed in ${latency}ms`);

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
        finishReason: data.choices[0]?.finish_reason as 'stop' | 'length',
      };
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error?.message || error.message;

      if (error.code === 'ECONNREFUSED') {
        this.logger.error('Foundry Local service is not running');
        throw new Error(
          'Foundry Local service is not running. Please start it with "foundry service start" or install from https://github.com/microsoft/Foundry-Local',
        );
      }

      this.logger.error(`Foundry Local chat failed: ${errorMessage}`);
      throw new Error(`Foundry Local error: ${errorMessage}`);
    }
  }

  /**
   * Generate embeddings using Foundry Local
   * Uses local embedding models like nomic-embed-text
   */
  async embed(
    texts: string[],
    options?: EmbeddingOptions & { endpoint?: string },
  ): Promise<EmbeddingResult> {
    const endpoint = this.getEndpoint(options?.endpoint);
    const model =
      options?.model ||
      process.env.FOUNDRY_LOCAL_EMBEDDING_MODEL ||
      'nomic-embed-text';
    const url = `${endpoint}/embeddings`;

    try {
      const response = await firstValueFrom(
        this.httpService.post<FoundryLocalEmbeddingResponse>(
          url,
          {
            model,
            input: texts,
          },
          {
            headers: {
              'Content-Type': 'application/json',
            },
            timeout: 60000,
          },
        ),
      );

      const data = response.data;
      const embeddings = data.data
        .sort((a, b) => a.index - b.index)
        .map((item) => item.embedding);

      const dimensions = embeddings[0]?.length || 768;

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

      if (error.code === 'ECONNREFUSED') {
        throw new Error(
          'Foundry Local service is not running. Please start it with "foundry service start"',
        );
      }

      // If embedding model is not loaded, provide helpful message
      if (
        errorMessage.includes('model not found') ||
        errorMessage.includes('not loaded')
      ) {
        throw new Error(
          `Embedding model "${model}" not loaded. Run "foundry model run ${model}" to load it.`,
        );
      }

      this.logger.error(`Foundry Local embedding failed: ${errorMessage}`);
      throw new Error(`Foundry Local embedding error: ${errorMessage}`);
    }
  }

  /**
   * Test connection to Foundry Local service
   */
  async testConnection(endpoint?: string): Promise<ConnectionTestResult> {
    const url = this.getEndpoint(endpoint);

    try {
      const startTime = Date.now();

      // Try to list models to verify service is running
      const response = await firstValueFrom(
        this.httpService.get<FoundryLocalModelsResponse>(`${url}/models`, {
          timeout: 10000,
        }),
      );

      const latency = Date.now() - startTime;
      const models = response.data.data || [];
      const loadedModels = models.filter((m) => m.id); // Models with IDs are loaded

      if (loadedModels.length === 0) {
        return {
          success: true,
          message:
            'Foundry Local service is running but no models are loaded. Run "foundry model run <model>" to load a model.',
          latencyMs: latency,
        };
      }

      const firstModel = loadedModels[0];

      return {
        success: true,
        message: `Connected to Foundry Local successfully. ${loadedModels.length} model(s) loaded.`,
        latencyMs: latency,
        modelInfo: {
          id: firstModel.id,
          name: firstModel.alias || firstModel.id,
        },
      };
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED') {
        return {
          success: false,
          message:
            'Foundry Local service is not running. Install from https://github.com/microsoft/Foundry-Local and run "foundry service start"',
        };
      }

      return {
        success: false,
        message: `Connection failed: ${error.message}`,
      };
    }
  }

  /**
   * Get service status including loaded models
   */
  async getServiceStatus(endpoint?: string): Promise<FoundryServiceStatus> {
    const url = this.getEndpoint(endpoint);

    try {
      const response = await firstValueFrom(
        this.httpService.get<FoundryLocalModelsResponse>(`${url}/models`, {
          timeout: 10000,
        }),
      );

      const models = response.data.data || [];

      return {
        running: true,
        endpoint: url,
        loadedModels: models,
      };
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED') {
        return {
          running: false,
        };
      }

      return {
        running: false,
      };
    }
  }

  /**
   * Get list of available models from the catalog
   * Note: This returns static list; dynamic list requires foundry CLI
   */
  getAvailableModels(): FoundryLocalModelInfo[] {
    return FOUNDRY_LOCAL_MODELS;
  }

  /**
   * Get loaded models from the running service
   */
  async getLoadedModels(endpoint?: string): Promise<FoundryModelInfo[]> {
    const url = this.getEndpoint(endpoint);

    try {
      const response = await firstValueFrom(
        this.httpService.get<FoundryLocalModelsResponse>(`${url}/models`, {
          timeout: 10000,
        }),
      );

      return response.data.data || [];
    } catch (_error) {
      this.logger.warn('Failed to get loaded models from Foundry Local');
      return [];
    }
  }

  /**
   * Chat with custom endpoint (for tenant-specific configurations)
   */
  async chatWithEndpoint(
    messages: ChatMessage[],
    endpoint: string,
    model: string,
    options?: ChatCompletionOptions,
  ): Promise<ChatCompletionResult> {
    return this.chat(messages, { ...options, endpoint, model });
  }

  /**
   * Embed with custom endpoint
   */
  async embedWithEndpoint(
    texts: string[],
    endpoint: string,
    model: string,
    options?: EmbeddingOptions,
  ): Promise<EmbeddingResult> {
    return this.embed(texts, { ...options, endpoint, model });
  }

  /**
   * Get hardware information about the current setup
   * This helps users understand what acceleration is being used
   */
  async getHardwareInfo(endpoint?: string): Promise<{
    accelerationType: 'CPU' | 'GPU' | 'NPU' | 'Unknown';
    loadedModels: Array<{ name: string; executionProvider: string }>;
  }> {
    const models = await this.getLoadedModels(endpoint);

    if (models.length === 0) {
      return {
        accelerationType: 'Unknown',
        loadedModels: [],
      };
    }

    // Determine primary acceleration type from loaded models
    const executionProviders = models.map((m) => m.executionProvider);
    let accelerationType: 'CPU' | 'GPU' | 'NPU' | 'Unknown' = 'CPU';

    if (
      executionProviders.some(
        (ep) => ep?.includes('CUDA') || ep?.includes('TensorRT'),
      )
    ) {
      accelerationType = 'GPU';
    } else if (
      executionProviders.some(
        (ep) => ep?.includes('QNN') || ep?.includes('NPU'),
      )
    ) {
      accelerationType = 'NPU';
    } else if (executionProviders.some((ep) => ep?.includes('OpenVINO'))) {
      accelerationType = 'GPU'; // Intel GPU
    }

    return {
      accelerationType,
      loadedModels: models.map((m) => ({
        name: m.alias || m.id,
        executionProvider: m.executionProvider,
      })),
    };
  }
}
