import { Module, Global, Logger, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MockAiProvider } from './mock-ai.provider';
import { FoundryAiProvider } from './foundry-ai.provider';
import { LocalAiProvider } from './local-ai.provider';
import { AzureOpenAiProvider } from './azure-openai.provider';
import { LocalModelGateway } from './local-model.gateway';
import { AI_PROVIDER_TOKEN } from './ai.interface';
import {
  RagService,
  RAG_BACKEND_TOKEN,
  InMemoryRagAdapter,
} from './rag.service';
import { PgVectorRagAdapter } from './pgvector-rag.adapter';
import { RagController } from './rag.controller';
import { AiProviderFactory } from './ai-provider.factory';
import { Tenant } from '../tenants/tenant.entity';

import { HttpModule, HttpService } from '@nestjs/axios';

const logger = new Logger('AiModule');

import { PiiRedactionService } from './pii-redaction.service';
import { RagLifecycleService } from './rag-lifecycle.service';
import { RequirementsModule } from '../requirements/requirements.module';
import { BugsModule } from '../bugs/bugs.module';
import { AgenticRagService } from './agentic-rag.service';
import { MetricsModule } from '../metrics/metrics.module';

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
  controllers: [RagController],
  providers: [
    PiiRedactionService,
    RagLifecycleService,
    LocalModelGateway,
    PgVectorRagAdapter,
    InMemoryRagAdapter,
    AzureOpenAiProvider,
    FoundryAiProvider,
    LocalAiProvider,
    MockAiProvider,
    AiProviderFactory,
    {
      provide: RAG_BACKEND_TOKEN,
      useFactory: (
        configService: ConfigService,
        pgVectorAdapter: PgVectorRagAdapter,
        inMemoryAdapter: InMemoryRagAdapter,
      ) => {
        const vectorStore = configService.get('VECTOR_STORE', 'pgvector');
        // RAG backend choice is currently system-wide infrastructure choice, not per-tenant yet.
        // But we could change this later. For now, pgvector is good for 'local' focus.
        if (vectorStore === 'pgvector') {
          return pgVectorAdapter;
        }
        return inMemoryAdapter;
      },
      inject: [ConfigService, PgVectorRagAdapter, InMemoryRagAdapter],
    },
    RagService,
    AgenticRagService,
  ],
  exports: [
    AiProviderFactory,
    RagService,
    AgenticRagService,
    PiiRedactionService,
    // Exporting concrete providers if needed, though Factory handles access
    FoundryAiProvider,
    AzureOpenAiProvider,
    LocalAiProvider,
    MockAiProvider,
  ],
})
export class AiModule { }
