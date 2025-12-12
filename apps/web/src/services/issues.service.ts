import { api } from '../lib/api-client';
import { Bug, BugAnalysisResult } from '../types/issue';

export const bugsApi = {
    list: () => api<Bug[]>('/bugs'),
    get: (id: string) => api<Bug>(`/bugs/${id}`),
    create: (data: Partial<Bug>) => api<Bug>('/bugs', { method: 'POST', body: data }),
    update: (id: string, data: Partial<Bug>) =>
        api<Bug>(`/bugs/${id}`, { method: 'PATCH', body: data }),
    delete: (id: string) => api(`/bugs/${id}`, { method: 'DELETE' }),
    triage: (id: string) => api<BugAnalysisResult>(`/bugs/${id}/triage`, { method: 'POST' }),
};
