import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../../tenants/tenant.entity';
import {
  AiProvider,
  ProviderType,
  TenantAiConfig,
  ConnectionTestResult,
  EmbeddingResult,
  EmbeddingOptions,
} from './ai-provider.types';
import { OpenAIProvider } from './openai.provider';
import { GeminiProvider } from './gemini.provider';
import { AnthropicProvider } from './anthropic.provider';
import { FoundryLocalProvider } from './foundry-local.provider';

export interface ProviderWithConfig {
  provider: AiProvider;
  config: {
    apiKey?: string;
    model?: string;
    embeddingModel?: string;
    endpoint?: string;
  };
}

/**
 * AI Provider Factory
 * Manages provider selection and configuration based on tenant settings
 *
 * Supports two main options:
 * - Option 1: Cloud APIs (OpenAI, Google Gemini, Anthropic) - user-supplied API keys
 * - Option 2: Foundry Local (on-device models) - 100% local, no data egress
 */
@Injectable()
export class AiProviderFactory {
  private readonly logger = new Logger(AiProviderFactory.name);

  constructor(
    private readonly openaiProvider: OpenAIProvider,
    private readonly geminiProvider: GeminiProvider,
    private readonly anthropicProvider: AnthropicProvider,
    private readonly foundryLocalProvider: FoundryLocalProvider,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
  ) {}

  /**
   * Get the appropriate provider for a tenant
   * Returns the provider instance and its configuration
   */
  async getProvider(tenantId: string): Promise<ProviderWithConfig> {
    // Fetch tenant configuration
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    const aiConfig = tenant?.settings?.aiConfig as TenantAiConfig | undefined;

    if (!aiConfig?.provider) {
      // No provider configured - throw error
      throw new Error(
        'No AI provider configured. Please configure an AI provider in Settings.',
      );
    }

    const providerType = aiConfig.provider;
    this.logger.debug(
      `Selecting AI provider for tenant ${tenantId}: ${providerType}`,
    );

    return this.getProviderByType(providerType, aiConfig);
  }

  /**
   * Get provider by type with configuration
   */
  private getProviderByType(
    providerType: ProviderType,
    aiConfig: TenantAiConfig,
  ): ProviderWithConfig {
    switch (providerType) {
      case 'openai': {
        const openaiConfig = aiConfig.cloudConfig?.openai;
        if (!openaiConfig?.apiKey) {
          throw new Error('OpenAI API key not configured');
        }
        return {
          provider: this.openaiProvider,
          config: {
            apiKey: openaiConfig.apiKey,
            model: openaiConfig.model || 'gpt-4o-mini',
            embeddingModel:
              openaiConfig.embeddingModel || 'text-embedding-3-small',
          },
        };
      }

      case 'gemini': {
        const geminiConfig = aiConfig.cloudConfig?.gemini;
        if (!geminiConfig?.apiKey) {
          throw new Error('Gemini API key not configured');
        }
        return {
          provider: this.geminiProvider,
          config: {
            apiKey: geminiConfig.apiKey,
            model: geminiConfig.model || 'gemini-1.5-flash',
            embeddingModel: geminiConfig.embeddingModel || 'text-embedding-004',
          },
        };
      }

      case 'anthropic': {
        const anthropicConfig = aiConfig.cloudConfig?.anthropic;
        if (!anthropicConfig?.apiKey) {
          throw new Error('Anthropic API key not configured');
        }
        return {
          provider: this.anthropicProvider,
          config: {
            apiKey: anthropicConfig.apiKey,
            model: anthropicConfig.model || 'claude-3-5-haiku-20241022',
          },
        };
      }

      case 'foundry_local': {
        const localConfig = aiConfig.foundryLocalConfig;
        return {
          provider: this.foundryLocalProvider,
          config: {
            endpoint: localConfig?.endpoint || 'http://127.0.0.1:55588/v1',
            model: localConfig?.model || 'phi-3.5-mini',
            embeddingModel: localConfig?.embeddingModel,
          },
        };
      }

      default: {
        const _exhaustiveCheck: never = providerType;
        throw new Error(`Unknown provider type: ${String(_exhaustiveCheck)}`);
      }
    }
  }

  /**
   * Get embedding provider for a tenant
   * Handles Anthropic's lack of embeddings by falling back to configured alternative
   */
  async getEmbeddingProvider(tenantId: string): Promise<{
    provider: AiProvider;
    config: { apiKey?: string; model?: string; embeddingModel?: string; endpoint?: string };
  }> {
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    const aiConfig = tenant?.settings?.aiConfig as TenantAiConfig | undefined;

    if (!aiConfig?.provider) {
      throw new Error('No AI provider configured');
    }

    // If using Anthropic, use their configured embedding provider
    if (aiConfig.provider === 'anthropic') {
      const anthropicConfig = aiConfig.cloudConfig?.anthropic;
      const embeddingProvider =
        anthropicConfig?.embeddingProvider || 'foundry_local';

      if (embeddingProvider === 'openai') {
        const embeddingKey = anthropicConfig?.embeddingApiKey;
        if (!embeddingKey) {
          throw new Error(
            'OpenAI API key for embeddings not configured. Anthropic does not support embeddings.',
          );
        }
        return {
          provider: this.openaiProvider,
          config: {
            apiKey: embeddingKey,
            model: 'text-embedding-3-small',
          },
        };
      } else {
        // Use Foundry Local for embeddings
        const localConfig = aiConfig.foundryLocalConfig;
        return {
          provider: this.foundryLocalProvider,
          config: {
            endpoint: localConfig?.endpoint || 'http://127.0.0.1:55588/v1',
            model: localConfig?.embeddingModel || 'nomic-embed-text',
          },
        };
      }
    }

    // For other providers, use the main provider for embeddings
    return this.getProvider(tenantId);
  }

  /**
   * Generate embeddings for texts using the tenant's configured provider
   */
  async generateEmbeddings(
    tenantId: string,
    texts: string[],
    options?: EmbeddingOptions,
  ): Promise<EmbeddingResult> {
    const { provider, config } = await this.getEmbeddingProvider(tenantId);

    // Use provider-specific embedding method with API key
    if (provider.providerType === 'openai') {
      return (provider as OpenAIProvider).embedWithKey(texts, config.apiKey!, {
        model: options?.model || config.embeddingModel || 'text-embedding-3-small',
      });
    } else if (provider.providerType === 'gemini') {
      return (provider as GeminiProvider).embedWithKey(texts, config.apiKey!, {
        model: options?.model || config.embeddingModel || 'text-embedding-004',
      });
    } else if (provider.providerType === 'foundry_local') {
      return (provider as FoundryLocalProvider).embedWithEndpoint(
        texts,
        config.endpoint!,
        options?.model || config.embeddingModel || 'nomic-embed-text',
      );
    }

    // Fallback
    return provider.embed(texts, options);
  }

  /**
   * Test connection for a specific provider type with provided credentials
   * Used during setup to validate configuration before saving
   */
  async testProviderConnection(
    providerType: ProviderType,
    credentials: {
      apiKey?: string;
      endpoint?: string;
      model?: string;
    },
  ): Promise<ConnectionTestResult> {
    switch (providerType) {
      case 'openai':
        return this.openaiProvider.testConnection(credentials.apiKey);

      case 'gemini':
        return this.geminiProvider.testConnection(credentials.apiKey);

      case 'anthropic':
        return this.anthropicProvider.testConnection(credentials.apiKey);

      case 'foundry_local':
        return this.foundryLocalProvider.testConnection(credentials.endpoint);

      default: {
        const _exhaustiveCheck: never = providerType;
        return {
          success: false,
          message: `Unknown provider type: ${String(_exhaustiveCheck)}`,
        };
      }
    }
  }

  /**
   * Get provider instance by type (without tenant context)
   * Useful for testing and admin operations
   */
  getProviderInstance(providerType: ProviderType): AiProvider {
    switch (providerType) {
      case 'openai':
        return this.openaiProvider;
      case 'gemini':
        return this.geminiProvider;
      case 'anthropic':
        return this.anthropicProvider;
      case 'foundry_local':
        return this.foundryLocalProvider;
      default: {
        const _exhaustiveCheck: never = providerType;
        throw new Error(`Unknown provider type: ${String(_exhaustiveCheck)}`);
      }
    }
  }

  /**
   * Get available models for a provider type
   */
  getAvailableModels(providerType: ProviderType) {
    const provider = this.getProviderInstance(providerType);
    return provider.getAvailableModels();
  }

  /**
   * Get Foundry Local service status
   */
  async getFoundryLocalStatus() {
    return this.foundryLocalProvider.getServiceStatus();
  }

  /**
   * Get Foundry Local hardware information
   */
  async getFoundryLocalHardwareInfo(endpoint?: string) {
    return this.foundryLocalProvider.getHardwareInfo(endpoint);
  }
}
