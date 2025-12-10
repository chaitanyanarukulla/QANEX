/**
 * AI Provider Types and Interfaces
 * Defines the new provider architecture supporting:
 * - Option 1: Cloud APIs (OpenAI, Google Gemini, Anthropic)
 * - Option 2: Foundry Local (on-device models via Microsoft Foundry Local)
 */

// ============================================
// Provider Types
// ============================================

export type CloudProviderType = 'openai' | 'gemini' | 'anthropic';
export type LocalProviderType = 'foundry_local';
export type ProviderType = CloudProviderType | LocalProviderType;

export type ProviderCategory = 'cloud' | 'local';

// ============================================
// Model Definitions
// ============================================

export interface ModelInfo {
  id: string;
  name: string;
  provider: ProviderType;
  description?: string;
  contextWindow: number;
  maxOutputTokens: number;
  costPer1kInput?: number;  // USD per 1k tokens
  costPer1kOutput?: number; // USD per 1k tokens
  capabilities: ModelCapability[];
  recommended?: boolean;
  category?: 'chat' | 'code' | 'embedding' | 'multimodal';
}

export type ModelCapability =
  | 'chat'
  | 'code_generation'
  | 'analysis'
  | 'embeddings'
  | 'vision'
  | 'function_calling';

// Available models per provider
export const OPENAI_MODELS: ModelInfo[] = [
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    description: 'Most capable model, best for complex tasks',
    contextWindow: 128000,
    maxOutputTokens: 16384,
    costPer1kInput: 0.005,
    costPer1kOutput: 0.015,
    capabilities: ['chat', 'code_generation', 'analysis', 'vision', 'function_calling'],
    recommended: true,
    category: 'multimodal',
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    description: 'Fast and cost-effective for most tasks',
    contextWindow: 128000,
    maxOutputTokens: 16384,
    costPer1kInput: 0.00015,
    costPer1kOutput: 0.0006,
    capabilities: ['chat', 'code_generation', 'analysis', 'function_calling'],
    recommended: true,
    category: 'chat',
  },
  {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'openai',
    description: 'Previous generation, still highly capable',
    contextWindow: 128000,
    maxOutputTokens: 4096,
    costPer1kInput: 0.01,
    costPer1kOutput: 0.03,
    capabilities: ['chat', 'code_generation', 'analysis', 'vision', 'function_calling'],
    category: 'multimodal',
  },
  {
    id: 'text-embedding-3-small',
    name: 'Embedding 3 Small',
    provider: 'openai',
    description: 'Fast embeddings for RAG',
    contextWindow: 8191,
    maxOutputTokens: 0,
    costPer1kInput: 0.00002,
    capabilities: ['embeddings'],
    recommended: true,
    category: 'embedding',
  },
  {
    id: 'text-embedding-3-large',
    name: 'Embedding 3 Large',
    provider: 'openai',
    description: 'Higher quality embeddings',
    contextWindow: 8191,
    maxOutputTokens: 0,
    costPer1kInput: 0.00013,
    capabilities: ['embeddings'],
    category: 'embedding',
  },
];

export const GEMINI_MODELS: ModelInfo[] = [
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    provider: 'gemini',
    description: 'Most capable Gemini model with 2M context',
    contextWindow: 2097152,
    maxOutputTokens: 8192,
    costPer1kInput: 0.00125,
    costPer1kOutput: 0.005,
    capabilities: ['chat', 'code_generation', 'analysis', 'vision', 'function_calling'],
    recommended: true,
    category: 'multimodal',
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    provider: 'gemini',
    description: 'Fast and efficient for most tasks',
    contextWindow: 1048576,
    maxOutputTokens: 8192,
    costPer1kInput: 0.000075,
    costPer1kOutput: 0.0003,
    capabilities: ['chat', 'code_generation', 'analysis', 'vision', 'function_calling'],
    recommended: true,
    category: 'chat',
  },
  {
    id: 'gemini-2.0-flash-exp',
    name: 'Gemini 2.0 Flash (Experimental)',
    provider: 'gemini',
    description: 'Latest experimental model with enhanced capabilities',
    contextWindow: 1048576,
    maxOutputTokens: 8192,
    costPer1kInput: 0.0001,
    costPer1kOutput: 0.0004,
    capabilities: ['chat', 'code_generation', 'analysis', 'vision', 'function_calling'],
    category: 'multimodal',
  },
  {
    id: 'text-embedding-004',
    name: 'Text Embedding 004',
    provider: 'gemini',
    description: 'Google embeddings for RAG',
    contextWindow: 2048,
    maxOutputTokens: 0,
    capabilities: ['embeddings'],
    recommended: true,
    category: 'embedding',
  },
];

export const ANTHROPIC_MODELS: ModelInfo[] = [
  {
    id: 'claude-sonnet-4-20250514',
    name: 'Claude Sonnet 4',
    provider: 'anthropic',
    description: 'Best balance of intelligence and speed',
    contextWindow: 200000,
    maxOutputTokens: 8192,
    costPer1kInput: 0.003,
    costPer1kOutput: 0.015,
    capabilities: ['chat', 'code_generation', 'analysis', 'vision', 'function_calling'],
    recommended: true,
    category: 'multimodal',
  },
  {
    id: 'claude-opus-4-20250514',
    name: 'Claude Opus 4',
    provider: 'anthropic',
    description: 'Most capable for complex reasoning',
    contextWindow: 200000,
    maxOutputTokens: 8192,
    costPer1kInput: 0.015,
    costPer1kOutput: 0.075,
    capabilities: ['chat', 'code_generation', 'analysis', 'vision', 'function_calling'],
    category: 'multimodal',
  },
  {
    id: 'claude-3-5-haiku-20241022',
    name: 'Claude 3.5 Haiku',
    provider: 'anthropic',
    description: 'Fast and cost-effective',
    contextWindow: 200000,
    maxOutputTokens: 8192,
    costPer1kInput: 0.0008,
    costPer1kOutput: 0.004,
    capabilities: ['chat', 'code_generation', 'analysis', 'function_calling'],
    recommended: true,
    category: 'chat',
  },
];

// ============================================
// Foundry Local Models
// ============================================

export interface FoundryLocalModelInfo {
  alias: string;
  name: string;
  description: string;
  task: 'chat-completions' | 'embeddings' | 'automatic-speech-recognition';
  contextWindow: number;
  recommendedFor?: string[];
  // These are populated dynamically from the Foundry Local service
  id?: string;
  executionProvider?: string;
  deviceType?: 'CPU' | 'GPU' | 'NPU';
  fileSizeMb?: number;
  supportsToolCalling?: boolean;
}

// Common Foundry Local model aliases - actual availability depends on user's system
export const FOUNDRY_LOCAL_MODELS: FoundryLocalModelInfo[] = [
  {
    alias: 'phi-3.5-mini',
    name: 'Phi-3.5 Mini',
    description: 'Microsoft small language model, efficient and capable',
    task: 'chat-completions',
    contextWindow: 4096,
    recommendedFor: ['Low-spec devices', 'Quick responses'],
  },
  {
    alias: 'phi-4',
    name: 'Phi-4',
    description: 'Microsoft latest Phi model with enhanced capabilities',
    task: 'chat-completions',
    contextWindow: 8192,
    recommendedFor: ['General use', 'Coding tasks'],
  },
  {
    alias: 'qwen2.5-0.5b',
    name: 'Qwen 2.5 0.5B',
    description: 'Lightweight model for basic tasks',
    task: 'chat-completions',
    contextWindow: 4096,
    recommendedFor: ['Resource-constrained', 'Quick chat'],
  },
  {
    alias: 'qwen2.5-3b',
    name: 'Qwen 2.5 3B',
    description: 'Balanced performance and quality',
    task: 'chat-completions',
    contextWindow: 8192,
    recommendedFor: ['General use', 'Analysis'],
  },
  {
    alias: 'mistral-7b',
    name: 'Mistral 7B',
    description: 'High-quality open model with long context',
    task: 'chat-completions',
    contextWindow: 32768,
    recommendedFor: ['General use', 'Longer contexts'],
  },
  {
    alias: 'llama-3.2-3b',
    name: 'Llama 3.2 3B',
    description: 'Meta Llama optimized for efficiency',
    task: 'chat-completions',
    contextWindow: 8192,
    recommendedFor: ['Quick chat', 'General use'],
  },
  {
    alias: 'deepseek-r1-distill-qwen-1.5b',
    name: 'DeepSeek R1 Distill 1.5B',
    description: 'Reasoning-focused distilled model',
    task: 'chat-completions',
    contextWindow: 4096,
    recommendedFor: ['Reasoning', 'Analysis'],
  },
];

// ============================================
// Provider Configuration
// ============================================

export interface BaseProviderConfig {
  provider: ProviderType;
  enabled: boolean;
}

export interface OpenAIConfig extends BaseProviderConfig {
  provider: 'openai';
  apiKey: string;
  organizationId?: string;
  baseUrl?: string; // For proxies or custom endpoints
  defaultModel: string;
  embeddingModel: string;
}

export interface GeminiConfig extends BaseProviderConfig {
  provider: 'gemini';
  apiKey: string;
  projectId?: string;
  location?: string;
  defaultModel: string;
  embeddingModel: string;
}

export interface AnthropicConfig extends BaseProviderConfig {
  provider: 'anthropic';
  apiKey: string;
  defaultModel: string;
  // Anthropic doesn't have embeddings, will use alternative
  embeddingProvider?: 'openai' | 'foundry_local';
  embeddingApiKey?: string;
}

export interface FoundryLocalConfig extends BaseProviderConfig {
  provider: 'foundry_local';
  endpoint: string; // Local endpoint URL (default: http://127.0.0.1:55588)
  defaultModel: string; // Model alias
  embeddingModel?: string; // Optional embedding model alias
  autoStart?: boolean;
}

export type ProviderConfig =
  | OpenAIConfig
  | GeminiConfig
  | AnthropicConfig
  | FoundryLocalConfig;

// ============================================
// AI Provider Interface
// ============================================

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  responseFormat?: 'text' | 'json';
}

export interface ChatCompletionResult {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: 'stop' | 'length' | 'content_filter';
}

export interface EmbeddingOptions {
  model?: string;
}

export interface EmbeddingResult {
  embeddings: number[][];
  model: string;
  dimensions: number;
  usage?: {
    totalTokens: number;
  };
}

export interface RequirementAnalysis {
  score: number;
  clarity: number;
  completeness: number;
  testability: number;
  consistency: number;
  feedback: string[];
  suggestedAcceptanceCriteria?: string[];
}

export interface BugTriageResult {
  suggestedSeverity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  suggestedPriority: 'P0' | 'P1' | 'P2' | 'P3';
  duplicateCandidates: string[];
  rootCauseHypothesis: string;
}

export interface RcsExplanation {
  summary: string;
  risks: string[];
  strengths: string[];
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  latencyMs?: number;
  modelInfo?: {
    id: string;
    name: string;
  };
}

export interface AiProvider {
  // Core properties
  readonly providerType: ProviderType;
  readonly providerName: string;
  readonly supportsEmbeddings: boolean;

  // Chat completion
  chat(
    messages: ChatMessage[],
    options?: ChatCompletionOptions,
  ): Promise<ChatCompletionResult>;

  // Simple prompt completion (convenience method)
  complete(
    prompt: string,
    options?: ChatCompletionOptions,
  ): Promise<string>;

  // Embeddings (may throw if not supported)
  embed(
    texts: string[],
    options?: EmbeddingOptions,
  ): Promise<EmbeddingResult>;

  // Domain-specific methods
  analyzeRequirement(
    content: string,
    context?: string,
  ): Promise<RequirementAnalysis>;

  triageBug(
    title: string,
    description: string,
    relatedContext?: string,
  ): Promise<BugTriageResult>;

  generateTestCode(
    testCase: { title: string; steps: { step: string; expected: string }[] },
    framework: string,
  ): Promise<string>;

  explainRcs(
    score: number,
    breakdown: Record<string, number>,
  ): Promise<RcsExplanation>;

  // Connection test
  testConnection(): Promise<ConnectionTestResult>;

  // Get available models
  getAvailableModels(): ModelInfo[] | FoundryLocalModelInfo[];
}

// ============================================
// Foundry Local Service Types
// ============================================

export interface FoundryModelInfo {
  alias: string;
  id: string;
  version: string;
  executionProvider: string;
  deviceType: 'CPU' | 'GPU' | 'NPU';
  uri: string;
  fileSizeMb: number;
  supportsToolCalling: boolean;
  promptTemplate?: Record<string, unknown>;
  provider: string;
  publisher: string;
  license: string;
  task: string;
}

export interface FoundryServiceStatus {
  running: boolean;
  endpoint?: string;
  loadedModels?: FoundryModelInfo[];
}

// ============================================
// Provider Status
// ============================================

export interface ProviderStatus {
  provider: ProviderType;
  category: ProviderCategory;
  status: 'connected' | 'disconnected' | 'error' | 'not_configured';
  message?: string;
  lastChecked?: Date;
  modelInUse?: string;
  // Foundry Local specific
  hardwareAcceleration?: 'CPU' | 'GPU' | 'NPU';
}

// ============================================
// Tenant AI Configuration
// ============================================

export interface TenantAiConfig {
  // Selected provider
  provider: ProviderType;

  // Cloud provider settings (Option 1)
  cloudConfig?: {
    openai?: {
      apiKey: string;
      model: string;
      embeddingModel: string;
    };
    gemini?: {
      apiKey: string;
      model: string;
      embeddingModel: string;
    };
    anthropic?: {
      apiKey: string;
      model: string;
      // Uses OpenAI or local for embeddings
      embeddingProvider: 'openai' | 'foundry_local';
      embeddingApiKey?: string;
    };
  };

  // Foundry Local settings (Option 2)
  foundryLocalConfig?: {
    endpoint: string;
    model: string;
    embeddingModel?: string;
  };
}

// ============================================
// Helper Functions
// ============================================

export function getProviderCategory(provider: ProviderType): ProviderCategory {
  if (provider === 'foundry_local') return 'local';
  return 'cloud';
}

export function getModelsForProvider(provider: ProviderType): ModelInfo[] {
  switch (provider) {
    case 'openai':
      return OPENAI_MODELS;
    case 'gemini':
      return GEMINI_MODELS;
    case 'anthropic':
      return ANTHROPIC_MODELS;
    default:
      return [];
  }
}

export function getDefaultModel(provider: ProviderType): string {
  switch (provider) {
    case 'openai':
      return 'gpt-4o-mini';
    case 'gemini':
      return 'gemini-1.5-flash';
    case 'anthropic':
      return 'claude-3-5-haiku-20241022';
    case 'foundry_local':
      return 'phi-3.5-mini';
    default:
      return '';
  }
}

export function getDefaultEmbeddingModel(provider: ProviderType): string {
  switch (provider) {
    case 'openai':
      return 'text-embedding-3-small';
    case 'gemini':
      return 'text-embedding-004';
    case 'foundry_local':
      return 'nomic-embed-text'; // Common local embedding model
    default:
      return '';
  }
}
