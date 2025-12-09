import { Module, Global, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MockAiProvider } from './mock-ai.provider';
import { FoundryAiProvider } from './foundry-ai.provider';
import { LocalAiProvider } from './local-ai.provider';
import { AzureOpenAiProvider } from './azure-openai.provider';
import { LocalModelGateway } from './local-model.gateway';
import { AI_PROVIDER_TOKEN } from './ai.interface';
import { RagService, RAG_BACKEND_TOKEN, InMemoryRagAdapter } from './rag.service';
import { PgVectorRagAdapter } from './pgvector-rag.adapter';
import { RagController } from './rag.controller';

import { HttpModule, HttpService } from '@nestjs/axios';
import { MetricsModule } from '../metrics/metrics.module';
import { AiMetricsService } from '../metrics/ai-metrics.service';

const logger = new Logger('AiModule');

@Global()
@Module({
  imports: [ConfigModule, HttpModule, TypeOrmModule, MetricsModule],
  controllers: [RagController],
  providers: [
    LocalModelGateway,
    PgVectorRagAdapter,
    InMemoryRagAdapter,
    AzureOpenAiProvider,
    {
      provide: RAG_BACKEND_TOKEN,
      useFactory: (
        configService: ConfigService,
        pgVectorAdapter: PgVectorRagAdapter,
        inMemoryAdapter: InMemoryRagAdapter,
      ) => {
        const vectorStore = configService.get('VECTOR_STORE', 'pgvector');
        const aiProvider = configService.get('AI_PROVIDER', 'mock');

        // Use pgvector for azure, local, or when explicitly set
        if (
          vectorStore === 'pgvector' ||
          aiProvider === 'azure' ||
          aiProvider === 'local'
        ) {
          logger.log('Using PgVector RAG backend');
          return pgVectorAdapter;
        }

        logger.log('Using InMemory RAG backend');
        return inMemoryAdapter;
      },
      inject: [ConfigService, PgVectorRagAdapter, InMemoryRagAdapter],
    },
    RagService,
    {
      provide: AI_PROVIDER_TOKEN,
      useFactory: (
        configService: ConfigService,
        httpService: HttpService,
        localAiProvider: LocalAiProvider,
        azureOpenAiProvider: AzureOpenAiProvider,
        aiMetrics: AiMetricsService,
      ) => {
        const provider = configService.get('AI_PROVIDER', 'mock');

        switch (provider) {
          case 'azure':
            logger.log('Using Azure OpenAI provider');
            return azureOpenAiProvider;

          case 'foundry':
            logger.log('Using Foundry AI provider');
            return new FoundryAiProvider(httpService, aiMetrics);

          case 'local':
            logger.log('Using Local AI provider (Ollama)');
            return localAiProvider;

          default:
            logger.log('Using Mock AI provider');
            return new MockAiProvider();
        }
      },
      inject: [
        ConfigService,
        HttpService,
        LocalAiProvider,
        AzureOpenAiProvider,
        AiMetricsService,
      ],
    },
    LocalAiProvider,
    MockAiProvider,
  ],
  exports: [
    AI_PROVIDER_TOKEN,
    RagService,
    MockAiProvider,
    LocalAiProvider,
    AzureOpenAiProvider,
  ],
})
export class AiModule {}
