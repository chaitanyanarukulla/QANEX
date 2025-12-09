export const aiConfig = {
    provider: process.env.AI_PROVIDER || 'mock', // 'mock' | 'foundry' | 'local'
    local: {
        llmBaseUrl: process.env.LOCAL_LLM_BASE_URL || 'http://localhost:11434/v1',
        embeddingBaseUrl: process.env.LOCAL_EMBEDDING_BASE_URL || 'http://localhost:11434/v1',
        vectorStore: process.env.LOCAL_VECTOR_STORE || 'pgvector', // 'pgvector' | 'qdrant' | 'azure'
    },

    tasks: {
        requirementAnalysis: {
            model: 'foundry:gpt-4.1',
            maxTokens: 2000,
            temperature: 0.2,
        },
        testSuggestion: {
            model: 'foundry:gpt-4.1-mini',
            maxTokens: 1500,
            temperature: 0.4,
        },
        bugTriage: {
            model: 'foundry:gpt-4.1',
            maxTokens: 1000,
            temperature: 0.1,
        },
        rcsExplanation: {
            model: 'foundry:gpt-4.1',
            maxTokens: 1000,
            temperature: 0.7,
        },
        codeGeneration: {
            model: 'foundry:gpt-4.1', // High capability for code
            maxTokens: 4000,
            temperature: 0.1,
        }
    },

    rag: {
        indexNamePrefix: 'tracegate_',
        defaultTopK: 5,
        minScoreThreshold: 0.75,
    },

    timeouts: {
        default: 30000, // 30s
        long: 60000,   // 60s
    }
};
