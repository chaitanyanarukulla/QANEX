import { Injectable, Logger } from '@nestjs/common';
import { AiProviderFactory } from './providers';
import { RagService } from './rag.service';
import { ChatMessage } from './providers/ai-provider.types';

interface RagItem {
  id: string;
  type: string;
  content: string;
  metadata: { title?: string };
}

/**
 * Agentic RAG Service
 * Implements a multi-step RAG pipeline:
 * 1. Plan - Generate search queries from user question
 * 2. Retrieve - Search vector database for relevant context
 * 3. Synthesize - Generate answer using retrieved context
 *
 * Works with all provider options:
 * - Cloud: OpenAI, Gemini, Anthropic
 * - Local: Foundry Local (100% on-device)
 */
@Injectable()
export class AgenticRagService {
  private readonly logger = new Logger(AgenticRagService.name);

  constructor(
    private readonly aiFactory: AiProviderFactory,
    private readonly ragService: RagService,
  ) {}

  /**
   * Answer a question using RAG with the tenant's configured provider
   */
  async answer(query: string, tenantId: string): Promise<string> {
    this.logger.log(`Agentic RAG processing query: ${query}`);

    // Get the provider for this tenant
    const { provider, config } = await this.aiFactory.getProvider(tenantId);

    // Step 1: Plan - Generate search queries
    const searchQueries = await this.generateSearchQueries(
      query,
      provider,
      config,
    );
    this.logger.debug(`Generated search queries: ${JSON.stringify(searchQueries)}`);

    // Step 2: Retrieve - Search for relevant context
    const context = await this.retrieveContext(searchQueries, tenantId);

    // Step 3: Synthesize - Generate answer
    return this.synthesizeAnswer(query, context, provider, config);
  }

  /**
   * Generate search queries from the user question
   */
  private async generateSearchQueries(
    query: string,
    provider: any,
    config: any,
  ): Promise<string[]> {
    const planPrompt = `You are an expert QA technical assistant.
User Query: "${query}"

Your goal is to answer this query using documentation.
Generate 1 to 3 distinct search queries to find relevant info.
Return strictly a JSON array of strings. Example: ["query1", "query2"]`;

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: 'You are a helpful assistant that generates search queries. Return only valid JSON.',
      },
      { role: 'user', content: planPrompt },
    ];

    try {
      // Use the new chat interface with provider-specific API key handling
      let result: string;

      if (provider.providerType === 'openai') {
        const response = await provider.chatWithKey(messages, config.apiKey, {
          temperature: 0.3,
          maxTokens: 200,
        });
        result = response.content;
      } else if (provider.providerType === 'gemini') {
        const response = await provider.chatWithKey(messages, config.apiKey, {
          temperature: 0.3,
          maxTokens: 200,
        });
        result = response.content;
      } else if (provider.providerType === 'anthropic') {
        const response = await provider.chatWithKey(messages, config.apiKey, {
          temperature: 0.3,
          maxTokens: 200,
        });
        result = response.content;
      } else if (provider.providerType === 'foundry_local') {
        const response = await provider.chatWithEndpoint(
          messages,
          config.endpoint,
          config.model,
          { temperature: 0.3, maxTokens: 200 },
        );
        result = response.content;
      } else {
        // Fallback to generic complete
        result = await provider.complete(planPrompt, {
          temperature: 0.3,
          maxTokens: 200,
        });
      }

      // Parse JSON array from response
      const jsonMatch = result.match(/\[.*\]/s);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed) && parsed.every((i) => typeof i === 'string')) {
          return parsed;
        }
      }
    } catch (e) {
      this.logger.warn('Failed to plan retrieval, falling back to original query', e);
    }

    return [query]; // Fallback to original query
  }

  /**
   * Retrieve context from vector database
   */
  private async retrieveContext(
    searchQueries: string[],
    tenantId: string,
  ): Promise<string> {
    const allResults: RagItem[] = [];

    for (const q of searchQueries) {
      const results = await this.ragService.search(q, tenantId, 3);
      allResults.push(...results);
    }

    // Deduplicate by ID
    const uniqueResults = Array.from(
      new Map(allResults.map((item) => [item.id, item])).values(),
    );

    if (uniqueResults.length === 0) {
      return 'No relevant context found in the knowledge base.';
    }

    return uniqueResults
      .map(
        (item: RagItem) =>
          `[${item.type}] ${item.metadata?.title || 'Untitled'}: ${item.content}`,
      )
      .join('\n\n');
  }

  /**
   * Synthesize answer from context
   */
  private async synthesizeAnswer(
    query: string,
    context: string,
    provider: any,
    config: any,
  ): Promise<string> {
    const synthesisPrompt = `You are an expert QA technical assistant.
User Query: "${query}"

Context:
${context}

Answer the user query based ONLY on the provided context.
If the context is insufficient, state that you don't have enough information.
Cite the specific [Type] Title if possible.`;

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: 'You are a helpful QA assistant. Answer based only on provided context.',
      },
      { role: 'user', content: synthesisPrompt },
    ];

    try {
      if (provider.providerType === 'openai') {
        const response = await provider.chatWithKey(messages, config.apiKey, {
          temperature: 0.7,
          maxTokens: 1000,
        });
        return response.content;
      } else if (provider.providerType === 'gemini') {
        const response = await provider.chatWithKey(messages, config.apiKey, {
          temperature: 0.7,
          maxTokens: 1000,
        });
        return response.content;
      } else if (provider.providerType === 'anthropic') {
        const response = await provider.chatWithKey(messages, config.apiKey, {
          temperature: 0.7,
          maxTokens: 1000,
        });
        return response.content;
      } else if (provider.providerType === 'foundry_local') {
        const response = await provider.chatWithEndpoint(
          messages,
          config.endpoint,
          config.model,
          { temperature: 0.7, maxTokens: 1000 },
        );
        return response.content;
      } else {
        return await provider.complete(synthesisPrompt, {
          temperature: 0.7,
          maxTokens: 1000,
        });
      }
    } catch (e) {
      this.logger.error('Failed to synthesize answer', e);
      return 'I encountered an error while processing your query. Please try again.';
    }
  }
}
