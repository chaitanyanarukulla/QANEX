import { api } from '../lib/api-client';
import { Requirement } from '../types/requirement';

export const requirementsApi = {
    list: () => api<Requirement[]>('/requirements'),
    get: (id: string) => api<Requirement>(`/requirements/${id}`),
    create: (data: Partial<Requirement>) =>
        api<Requirement>('/requirements', { method: 'POST', body: data }),
    update: (id: string, data: Partial<Requirement>) =>
        api<Requirement>(`/requirements/${id}`, { method: 'PATCH', body: data }),
    delete: (id: string) => api(`/requirements/${id}`, { method: 'DELETE' }),
    analyze: (id: string) => api<Requirement>(`/requirements/${id}/analyze`, { method: 'POST' }),
    approve: (id: string) => api<Requirement>(`/requirements/${id}/approve`, { method: 'POST' }),
    generateTasks: (id: string) => api<{ count: number; tasks: unknown[] }>(`/requirements/${id}/generate-tasks`, { method: 'POST' }),
    moveTasksToBacklog: (id: string) => api<{ count: number }>(`/requirements/${id}/move-tasks-backlog`, { method: 'POST' }),
    assignToSprint: (id: string, sprintId: string) => api<Requirement>(`/requirements/${id}/assign/${sprintId}`, { method: 'POST' }),
};
