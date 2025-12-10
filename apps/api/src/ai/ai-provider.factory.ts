import { Injectable, Inject, forwardRef } from '@nestjs/common';
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
    constructor(
        private readonly foundryProvider: FoundryAiProvider,
        private readonly azureProvider: AzureOpenAiProvider,
        private readonly localProvider: LocalAiProvider,
        private readonly mockProvider: MockAiProvider,
        // Injecting TypeORM repo directly to avoid circular dependency if TenantsService uses AI stuff
        @InjectRepository(Tenant)
        private readonly tenantRepo: Repository<Tenant>,
    ) { }

    async getProvider(tenantId: string): Promise<{ provider: AiProvider; config: { apiKey?: string } }> {
        try {
            const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
            const aiConfig = tenant?.settings?.aiConfig || {};
            const providerType = aiConfig.provider;

            let provider: AiProvider;
            switch (providerType) {
                case 'foundry':
                    provider = this.foundryProvider;
                    break;
                case 'azure':
                    provider = this.azureProvider;
                    break;
                case 'local':
                    provider = this.localProvider;
                    break;
                default:
                    // Fallback
                    const systemDefault = process.env.AI_PROVIDER;
                    if (systemDefault === 'foundry') provider = this.foundryProvider;
                    else if (systemDefault === 'azure') provider = this.azureProvider;
                    else if (systemDefault === 'local') provider = this.localProvider;
                    else provider = this.mockProvider;
            }
            return { provider, config: { apiKey: aiConfig.apiKey } };
        } catch (error) {
            console.error(`Failed to resolve AI provider for tenant ${tenantId}`, error);
            return { provider: this.mockProvider, config: {} };
        }
    }
}
