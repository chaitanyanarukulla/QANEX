import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/auth.decorators';
import { AiProviderFactory } from './providers';
import {
  ProviderType,
  ConnectionTestResult,
  OPENAI_MODELS,
  GEMINI_MODELS,
  ANTHROPIC_MODELS,
  FOUNDRY_LOCAL_MODELS,
  getProviderCategory,
} from './providers/ai-provider.types';

interface TestConnectionDto {
  provider: ProviderType;
  apiKey?: string;
  endpoint?: string;
}

interface ProviderInfo {
  type: ProviderType;
  name: string;
  category: 'cloud' | 'local';
  description: string;
  supportsEmbeddings: boolean;
  requiresApiKey: boolean;
  models: any[];
  setupInstructions?: string;
}

/**
 * AI Settings Controller
 * Handles AI provider configuration, testing, and model discovery
 */
@Controller('ai/settings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AiSettingsController {
  constructor(private readonly aiProviderFactory: AiProviderFactory) {}

  /**
   * Get all available providers with their information
   */
  @Get('providers')
  @Roles('ORG_ADMIN', 'ADMIN')
  getAvailableProviders(): ProviderInfo[] {
    return [
      // Cloud Providers (Option 1)
      {
        type: 'openai',
        name: 'OpenAI',
        category: 'cloud',
        description:
          'GPT-4o, GPT-4o Mini, and embedding models. Best for complex reasoning and code generation.',
        supportsEmbeddings: true,
        requiresApiKey: true,
        models: OPENAI_MODELS,
        setupInstructions:
          'Get your API key from https://platform.openai.com/api-keys',
      },
      {
        type: 'gemini',
        name: 'Google Gemini',
        category: 'cloud',
        description:
          'Gemini 1.5 Pro/Flash with up to 2M context window. Great for long documents.',
        supportsEmbeddings: true,
        requiresApiKey: true,
        models: GEMINI_MODELS,
        setupInstructions:
          'Get your API key from https://aistudio.google.com/app/apikey',
      },
      {
        type: 'anthropic',
        name: 'Anthropic Claude',
        category: 'cloud',
        description:
          'Claude Sonnet 4, Opus 4, and Haiku. Excellent for analysis and careful reasoning.',
        supportsEmbeddings: false,
        requiresApiKey: true,
        models: ANTHROPIC_MODELS,
        setupInstructions:
          'Get your API key from https://console.anthropic.com/settings/keys. Note: Embeddings require OpenAI or Foundry Local.',
      },
      // Local Provider (Option 2)
      {
        type: 'foundry_local',
        name: 'Foundry Local',
        category: 'local',
        description:
          '100% on-device AI. No data leaves your machine. Uses Microsoft Foundry Local runtime.',
        supportsEmbeddings: true,
        requiresApiKey: false,
        models: FOUNDRY_LOCAL_MODELS,
        setupInstructions:
          'Install from https://github.com/microsoft/Foundry-Local. Windows: winget install Microsoft.FoundryLocal | macOS: brew install microsoft/foundrylocal/foundrylocal',
      },
    ];
  }

  /**
   * Test connection to a provider
   */
  @Post('test-connection')
  @Roles('ORG_ADMIN', 'ADMIN')
  async testConnection(
    @Body() dto: TestConnectionDto,
  ): Promise<ConnectionTestResult> {
    const { provider, apiKey, endpoint } = dto;

    if (!provider) {
      throw new BadRequestException('Provider type is required');
    }

    // Validate required credentials
    if (getProviderCategory(provider) === 'cloud' && !apiKey) {
      return {
        success: false,
        message: `API key is required for ${provider}`,
      };
    }

    try {
      return await this.aiProviderFactory.testProviderConnection(provider, {
        apiKey,
        endpoint,
      });
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Connection test failed',
      };
    }
  }

  /**
   * Get models for a specific provider
   */
  @Get('models/:provider')
  @Roles('ORG_ADMIN', 'ADMIN')
  getModelsForProvider(@Req() req: any): any[] {
    const provider = req.params.provider as ProviderType;

    switch (provider) {
      case 'openai':
        return OPENAI_MODELS;
      case 'gemini':
        return GEMINI_MODELS;
      case 'anthropic':
        return ANTHROPIC_MODELS;
      case 'foundry_local':
        return FOUNDRY_LOCAL_MODELS;
      default: {
        const _exhaustiveCheck: never = provider;
        throw new BadRequestException(
          `Unknown provider: ${String(_exhaustiveCheck)}`,
        );
      }
    }
  }

  /**
   * Get Foundry Local service status
   */
  @Get('foundry-local/status')
  @Roles('ORG_ADMIN', 'ADMIN')
  async getFoundryLocalStatus() {
    try {
      const status = await this.aiProviderFactory.getFoundryLocalStatus();
      const hardware = status.running
        ? await this.aiProviderFactory.getFoundryLocalHardwareInfo()
        : null;

      return {
        ...status,
        hardwareInfo: hardware,
      };
    } catch (error: any) {
      return {
        running: false,
        error: error.message,
      };
    }
  }

  /**
   * Get loaded models from Foundry Local
   */
  @Get('foundry-local/models')
  @Roles('ORG_ADMIN', 'ADMIN')
  async getFoundryLocalModels() {
    try {
      const provider = this.aiProviderFactory.getProviderInstance(
        'foundry_local',
      ) as any;
      const loadedModels = await provider.getLoadedModels();
      const availableModels = FOUNDRY_LOCAL_MODELS;

      return {
        loaded: loadedModels,
        available: availableModels,
      };
    } catch (error: any) {
      return {
        loaded: [],
        available: FOUNDRY_LOCAL_MODELS,
        error: error.message,
      };
    }
  }

  /**
   * Get embedding options based on provider
   * Useful for Anthropic users who need to choose an embedding provider
   */
  @Get('embedding-options/:provider')
  @Roles('ORG_ADMIN', 'ADMIN')
  getEmbeddingOptions(@Req() req: any) {
    const provider = req.params.provider as ProviderType;

    if (provider === 'anthropic') {
      return {
        needsAlternative: true,
        message:
          'Anthropic does not provide embeddings. Choose an alternative:',
        options: [
          {
            provider: 'openai',
            name: 'OpenAI Embeddings',
            requiresApiKey: true,
            models: OPENAI_MODELS.filter((m) => m.category === 'embedding'),
          },
          {
            provider: 'foundry_local',
            name: 'Foundry Local Embeddings',
            requiresApiKey: false,
            models: FOUNDRY_LOCAL_MODELS.filter((m) => m.task === 'embeddings'),
          },
        ],
      };
    }

    return {
      needsAlternative: false,
      message: `${provider} supports native embeddings`,
    };
  }

  /**
   * Validate complete AI configuration
   */
  @Post('validate-config')
  @Roles('ORG_ADMIN', 'ADMIN')
  async validateConfiguration(
    @Body()
    config: {
      provider: ProviderType;
      apiKey?: string;
      model?: string;
      endpoint?: string;
      embeddingProvider?: 'openai' | 'foundry_local';
      embeddingApiKey?: string;
    },
  ) {
    const issues: string[] = [];
    const warnings: string[] = [];

    // Test main provider
    const connectionResult =
      await this.aiProviderFactory.testProviderConnection(config.provider, {
        apiKey: config.apiKey,
        endpoint: config.endpoint,
      });

    if (!connectionResult.success) {
      issues.push(`Main provider: ${connectionResult.message}`);
    }

    // Test embedding provider for Anthropic
    if (config.provider === 'anthropic') {
      if (!config.embeddingProvider) {
        issues.push(
          'Anthropic requires an embedding provider (OpenAI or Foundry Local)',
        );
      } else if (
        config.embeddingProvider === 'openai' &&
        !config.embeddingApiKey
      ) {
        issues.push('OpenAI API key required for embeddings');
      } else if (config.embeddingProvider === 'foundry_local') {
        const foundryStatus =
          await this.aiProviderFactory.getFoundryLocalStatus();
        if (!foundryStatus.running) {
          warnings.push(
            'Foundry Local is not running. Start it before using embeddings.',
          );
        }
      }
    }

    // Validate Foundry Local if selected
    if (config.provider === 'foundry_local') {
      const foundryStatus =
        await this.aiProviderFactory.getFoundryLocalStatus();
      if (!foundryStatus.running) {
        issues.push('Foundry Local service is not running');
      } else if (!foundryStatus.loadedModels?.length) {
        warnings.push(
          'No models loaded in Foundry Local. Run "foundry model run <model>" to load one.',
        );
      }
    }

    return {
      valid: issues.length === 0,
      issues,
      warnings,
      connectionResult,
    };
  }
}
