import { api } from '../lib/api-client';
import { Release, ReleaseGatesEvaluation } from '../types/release';

export const releasesApi = {
    list: () => api<Release[]>('/releases'),
    get: (id: string) => api<Release>(`/releases/${id}`),
    create: (data: Partial<Release>) => api<Release>('/releases', { method: 'POST', body: data }),
    update: (id: string, data: Partial<Release>) =>
        api<Release>(`/releases/${id}`, { method: 'PATCH', body: data }),
    calculateRcs: (id: string) => api<Release>(`/releases/${id}/rcs`, { method: 'POST' }),
    evaluateGates: (id: string, overrideReason?: string) =>
        api<ReleaseGatesEvaluation>(`/releases/${id}/evaluate-gates`, {
            method: 'POST',
            body: { overrideReason },
        }),
};
