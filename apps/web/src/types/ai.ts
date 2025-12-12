
export interface AIProviderStats {
    calls: number;
    tokens: number;
    cost: number;
    avgLatency: number;
    models: Record<string, number>;
}

export interface AiModelCost {
    model: string;
    calls: number;
    tokens: number;
    cost: number;
    requests: number;
}

export interface AiUsageByDate {
    date: string;
    tokens: number;
    cost: number;
    requests: number;
}

export interface AiUsageByProviderDate extends AiUsageByDate {
    provider: string;
}

export type AIProviderType = 'openai' | 'gemini' | 'anthropic' | 'foundry_local';

export interface AICloudConfig {
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
        embeddingProvider: 'openai' | 'foundry_local';
        embeddingApiKey?: string;
    };
}

export interface AIFoundryLocalConfig {
    endpoint: string;
    model: string;
    embeddingModel?: string;
}

export interface TenantAIConfig {
    provider?: AIProviderType;
    cloudConfig?: AICloudConfig;
    foundryLocalConfig?: AIFoundryLocalConfig;
}

export interface AIModelInfo {
    id: string;
    name: string;
    provider: AIProviderType;
    description?: string;
    contextWindow: number;
    maxOutputTokens: number;
    costPer1kInput?: number;
    costPer1kOutput?: number;
    capabilities: string[];
    recommended?: boolean;
    category?: 'chat' | 'code' | 'embedding' | 'multimodal';
}

export interface AIProviderInfo {
    type: AIProviderType;
    name: string;
    category: 'cloud' | 'local';
    description: string;
    supportsEmbeddings: boolean;
    requiresApiKey: boolean;
    models: AIModelInfo[];
    setupInstructions?: string;
}

export interface AIConnectionTestResult {
    success: boolean;
    message: string;
    latencyMs?: number;
    modelInfo?: {
        id: string;
        name: string;
    };
}

export interface AIFoundryLocalStatus {
    running: boolean;
    endpoint?: string;
    loadedModels?: Record<string, unknown>[];
    hardwareInfo?: {
        accelerationType: 'CPU' | 'GPU' | 'NPU' | 'Unknown';
        loadedModels: Array<{ name: string; executionProvider: string }>;
    };
    error?: string;
}

export interface SearchResult {
    id: string;
    type: 'REQUIREMENT' | 'BUG' | 'TEST' | 'RELEASE';
    content: string;
    metadata: {
        title?: string;
        [key: string]: unknown;
    };
}
