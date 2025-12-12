import { api } from '../lib/api-client';
import {
    SearchResult,
    AIProviderInfo,
    AIProviderType,
    AIConnectionTestResult,
    AIModelInfo,
    AIFoundryLocalStatus
} from '../types/ai';

// AI/RAG API
export const aiApi = {
    search: (query: string, mode: 'simple' | 'agentic' = 'simple') =>
        api<SearchResult[]>('/ai/search', { method: 'POST', body: { query, mode } }),
    listDocuments: () => api<SearchResult[]>('/ai/documents'),
    deleteDocument: (id: string) => api<{ status: string; id: string }>(`/ai/documents/${id}`, { method: 'DELETE' }),
    reindex: () => api<{ status: string; indexed: { total: number } }>('/ai/reindex', { method: 'POST' }),
};

// AI Settings API
export const aiSettingsApi = {
    getProviders: () => api<AIProviderInfo[]>('/ai/settings/providers'),

    testConnection: (provider: AIProviderType, credentials: { apiKey?: string; endpoint?: string }) =>
        api<AIConnectionTestResult>('/ai/settings/test-connection', {
            method: 'POST',
            body: { provider, ...credentials },
        }),

    getModels: (provider: AIProviderType) => api<AIModelInfo[]>(`/ai/settings/models/${provider}`),

    getFoundryLocalStatus: () => api<AIFoundryLocalStatus>('/ai/settings/foundry-local/status'),

    getFoundryLocalModels: () =>
        api<{ loaded: Record<string, unknown>[]; available: Record<string, unknown>[]; error?: string }>('/ai/settings/foundry-local/models'),

    getEmbeddingOptions: (provider: AIProviderType) =>
        api<{
            needsAlternative: boolean;
            message: string;
            options?: Array<{
                provider: string;
                name: string;
                requiresApiKey: boolean;
                models: AIModelInfo[];
            }>;
        }>(`/ai/settings/embedding-options/${provider}`),

    validateConfig: (config: {
        provider: AIProviderType;
        apiKey?: string;
        model?: string;
        endpoint?: string;
        embeddingProvider?: 'openai' | 'foundry_local';
        embeddingApiKey?: string;
    }) =>
        api<{
            valid: boolean;
            issues: string[];
            warnings: string[];
            connectionResult: AIConnectionTestResult;
        }>('/ai/settings/validate-config', {
            method: 'POST',
            body: config,
        }),
};
