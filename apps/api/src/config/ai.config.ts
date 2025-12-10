/**
 * AI Configuration
 *
 * New Provider Architecture:
 * - Option 1 (Cloud): OpenAI, Google Gemini, Anthropic
 * - Option 2 (Local): Microsoft Foundry Local
 *
 * Provider configuration is now primarily tenant-based (stored in DB).
 * These environment variables serve as system defaults.
 */
export const aiConfig = {
  // Default provider (used if tenant has no configuration)
  // Options: 'openai' | 'gemini' | 'anthropic' | 'foundry_local'
  defaultProvider: process.env.AI_PROVIDER || 'foundry_local',

  // Cloud Provider Defaults (Option 1)
  cloud: {
    openai: {
      baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
      defaultModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      embeddingModel:
        process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
    },
    gemini: {
      baseUrl:
        process.env.GEMINI_BASE_URL ||
        'https://generativelanguage.googleapis.com/v1beta',
      defaultModel: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
      embeddingModel:
        process.env.GEMINI_EMBEDDING_MODEL || 'text-embedding-004',
    },
    anthropic: {
      baseUrl: process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com/v1',
      defaultModel: process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-20241022',
    },
  },

  // Foundry Local Defaults (Option 2)
  foundryLocal: {
    endpoint: process.env.FOUNDRY_LOCAL_ENDPOINT || 'http://127.0.0.1:55588/v1',
    defaultModel: process.env.FOUNDRY_LOCAL_MODEL || 'phi-3.5-mini',
    embeddingModel:
      process.env.FOUNDRY_LOCAL_EMBEDDING_MODEL || 'nomic-embed-text',
  },

  // Vector Store configuration
  vectorStore: process.env.VECTOR_STORE || 'pgvector', // 'pgvector' | 'memory'

  // Task-specific settings (model selection now per-tenant)
  tasks: {
    requirementAnalysis: {
      maxTokens: 2000,
      temperature: 0.2,
    },
    testSuggestion: {
      maxTokens: 1500,
      temperature: 0.4,
    },
    bugTriage: {
      maxTokens: 1000,
      temperature: 0.1,
    },
    rcsExplanation: {
      maxTokens: 1000,
      temperature: 0.7,
    },
    codeGeneration: {
      maxTokens: 4000,
      temperature: 0.1,
    },
  },

  // RAG settings
  rag: {
    indexNamePrefix: 'qanexus_',
    defaultTopK: 5,
    minScoreThreshold: 0.75,
  },

  // Timeouts
  timeouts: {
    default: 30000, // 30s
    long: 120000, // 120s for local models
  },
};
