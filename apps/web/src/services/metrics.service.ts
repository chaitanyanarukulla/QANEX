import { api } from '../lib/api-client';
import { AiUsageByDate, AIProviderStats, AiModelCost, AiUsageByProviderDate } from '../types/ai';
import { DashboardMetrics } from '../types/metrics';

export const metricsApi = {
    dashboard: () => api<DashboardMetrics>('/metrics/dashboard'),

    // AI usage history (daily aggregates)
    aiUsage: () => api<AiUsageByDate[]>('/metrics/ai/usage'),

    // Stats by provider
    aiProviders: () => api<Record<string, AIProviderStats>>('/metrics/ai/providers'),

    // Cost breakdown by model
    aiModels: () => api<AiModelCost[]>('/metrics/ai/models'),

    // Usage history by provider
    aiUsageByProvider: () => api<AiUsageByProviderDate[]>('/metrics/ai/usage/providers'),
};
