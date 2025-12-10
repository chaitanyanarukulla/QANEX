import { Module, Global, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';

// New Provider Architecture
import {
  OpenAIProvider,
  GeminiProvider,
  AnthropicProvider,
  FoundryLocalProvider,
  AiProviderFactory,
} from './providers';

// RAG Services
import {
  RagService,
  RAG_BACKEND_TOKEN,
  InMemoryRagAdapter,
} from './rag.service';
import { PgVectorRagAdapter } from './pgvector-rag.adapter';
import { RagController } from './rag.controller';
import { RagLifecycleService } from './rag-lifecycle.service';
import { AgenticRagService } from './agentic-rag.service';

// Other Services
import { PiiRedactionService } from './pii-redaction.service';
import { AiSettingsController } from './ai-settings.controller';

// Entities
import { Tenant } from '../tenants/tenant.entity';

// Related Modules
import { RequirementsModule } from '../requirements/requirements.module';
import { BugsModule } from '../bugs/bugs.module';
import { MetricsModule } from '../metrics/metrics.module';

/**
 * AI Module
 *
 * New Provider Architecture:
 * - Option 1 (Cloud): OpenAI, Google Gemini, Anthropic
 * - Option 2 (Local): Microsoft Foundry Local
 *
 * Features:
 * - Multi-provider support with tenant-level configuration
 * - RAG with pgvector for semantic search
 * - PII redaction for data privacy
 * - Agentic RAG for intelligent querying
 */
@Global()
@Module({
  imports: [
    ConfigModule,
    HttpModule,
    TypeOrmModule.forFeature([Tenant]),
    forwardRef(() => RequirementsModule),
    forwardRef(() => BugsModule),
    MetricsModule,
  ],
  controllers: [RagController, AiSettingsController],
  providers: [
    // New Providers (Option 1 - Cloud)
    OpenAIProvider,
    GeminiProvider,
    AnthropicProvider,

    // New Provider (Option 2 - Local)
    FoundryLocalProvider,

    // Provider Factory
    AiProviderFactory,

    // RAG Infrastructure
    PiiRedactionService,
    RagLifecycleService,
    PgVectorRagAdapter,
    InMemoryRagAdapter,

    // RAG Backend Selection
    {
      provide: RAG_BACKEND_TOKEN,
      useFactory: (
        configService: ConfigService,
        pgVectorAdapter: PgVectorRagAdapter,
        inMemoryAdapter: InMemoryRagAdapter,
      ) => {
        const vectorStore = configService.get<string>(
          'VECTOR_STORE',
          'pgvector',
        );
        if (vectorStore === 'pgvector') {
          return pgVectorAdapter;
        }
        return inMemoryAdapter;
      },
      inject: [ConfigService, PgVectorRagAdapter, InMemoryRagAdapter],
    },

    // RAG Services
    RagService,
    AgenticRagService,
  ],
  exports: [
    // Export new provider architecture
    AiProviderFactory,
    OpenAIProvider,
    GeminiProvider,
    AnthropicProvider,
    FoundryLocalProvider,

    // Export RAG services
    RagService,
    AgenticRagService,
    PiiRedactionService,
  ],
})
export class AiModule {}
