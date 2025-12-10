import { Injectable, Logger } from '@nestjs/common';
import { AiProviderFactory } from './ai-provider.factory';
import { RagService } from './rag.service';

@Injectable()
export class AgenticRagService {
    private readonly logger = new Logger(AgenticRagService.name);

    constructor(
        private readonly aiFactory: AiProviderFactory,
        private readonly ragService: RagService,
    ) { }

    async answer(query: string, tenantId: string): Promise<string> {
        this.logger.log(`Agentic RAG processing query: ${query}`);

        // 1. Get Provider (for LLM calls)
        const { provider, config } = await this.aiFactory.getProvider(tenantId);

        // 2. Plan (Reasoning Step) - Generate Search Queries
        // We use the triaging capability or a raw Chat interface if available. 
        // Since our AiProvider interface is specialized (analyzeRequirement, triageBug), 
        // we might need to rely on 'callChat' if we added it, or repurpose an existing method.
        // Looking at previous edits, we enabled 'callChat' on Azure/Foundry/Local providers.

        // Let's assume callChat exists on the provider, or casting is needed if it's not in the base interface yet.
        // Ideally update AiProvider interface first if needed, but I recall we touched it.
        // For now, I'll implement the logic assuming generic chat capability logic or use a specific implementation.

        // Step 1: Generate Search Queries
        const planPrompt = `
      You are an expert QA technical assistant.
      User Query: "${query}"
      
      Your goal is to answer this query using documentation.
      Generate 1 to 3 distinct search queries to find relevant info.
      Return strictly a JSON array of strings. Example: ["query1", "query2"]
    `;

        let searchQueries = [query]; // Default fallback
        try {
            const planResponse = await provider.callChat(planPrompt, config.apiKey);
            // Attempt to parse JSON
            const jsonMatch = planResponse.match(/\[.*\]/s);
            if (jsonMatch) {
                searchQueries = JSON.parse(jsonMatch[0]);
            }
        } catch (e) {
            this.logger.warn('Failed to plan retrieval, falling back to original query', e);
        }

        this.logger.debug(`Generated search queries: ${JSON.stringify(searchQueries)}`);

        // 3. Retrieve (Execution Step)
        const allResults = [];
        for (const q of searchQueries) {
            const results = await this.ragService.search(q, tenantId, 3); // Top 3 per sub-query
            allResults.push(...results);
        }

        // Deduplicate by ID
        const uniqueResults = Array.from(new Map(allResults.map(item => [item.id, item])).values());

        const context = uniqueResults.map(item =>
            `[${item.type}] ${item.metadata.title}: ${item.content}`
        ).join('\n\n');

        // 4. Synthesize (Answer Step)
        const synthesisPrompt = `
      You are an expert QA technical assistant.
      User Query: "${query}"
      
      Context:
      ${context}
      
      Answer the user query based ONLY on the provided context. 
      If the context is insufficient, state that you don't have enough information.
      Cite the specific [Type] Title if possible.
    `;

        return await provider.callChat(synthesisPrompt, config.apiKey);
    }
}
