import { Injectable, Logger } from '@nestjs/common';
import { AiProvider } from './ai.interface';
import { FoundryAiProvider } from './foundry-ai.provider';
import { AzureOpenAiProvider } from './azure-openai.provider';
import { LocalAiProvider } from './local-ai.provider';
import { MockAiProvider } from './mock-ai.provider';
import { InjectRepository } from '@nestjs/typeorm';
import { Tenant } from '../tenants/tenant.entity';

import { Repository } from 'typeorm';

@Injectable()
export class AiProviderFactory {
  private readonly logger = new Logger(AiProviderFactory.name);

  constructor(
    private readonly foundryProvider: FoundryAiProvider,
    private readonly azureProvider: AzureOpenAiProvider,
    private readonly localProvider: LocalAiProvider,
    private readonly mockProvider: MockAiProvider,
    // Injecting TypeORM repo directly to avoid circular dependency if TenantsService uses AI stuff
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
  ) {}

  async getProvider(
    tenantId: string,
  ): Promise<{ provider: AiProvider; config: { apiKey?: string } }> {
    // 1. Fetch tenant config
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    const config = tenant?.settings?.aiConfig;

    const providerType = config?.provider || 'foundry'; // default

    this.logger.debug(
      `Selecting AI provider for tenant ${tenantId}: ${providerType} `,
    );

    switch (providerType) {
      case 'local':
        return {
          provider: this.localProvider,
          config: { apiKey: config?.apiKey },
        };
      case 'azure':
        return {
          provider: this.azureProvider,
          config: { apiKey: config?.apiKey },
        };
      case 'mock':
        return {
          provider: this.mockProvider,
          config: { apiKey: 'mock-key' },
        };
      case 'foundry':
      default: {
        const apiKey = config?.apiKey;
        if (!apiKey) {
          this.logger.warn(
            `No API Key found for Foundry provider for tenant ${tenantId}.Using system default or failing.`,
          );
        }
        return {
          provider: this.foundryProvider,
          config: { apiKey },
        };
      }
    }
  }
}
