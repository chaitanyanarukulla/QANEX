import { api } from '../lib/api-client';
import { TenantAIConfig } from '../types/ai';

export interface TenantSettings {
    rqsThreshold?: number;
    rcsThresholds?: Record<string, number>;
    aiConfig?: TenantAIConfig;
}

export const tenantsApi = {
    get: (id: string) => api<{ id: string; settings: TenantSettings }>(`/tenants/${id}`),
    updateSettings: (id: string, settings: TenantSettings) =>
        api<{ settings: TenantSettings }>(`/tenants/${id}/settings`, {
            method: 'POST',
            body: settings,
        }),
};
