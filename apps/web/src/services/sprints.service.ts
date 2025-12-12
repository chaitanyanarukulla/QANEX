import { api } from '../lib/api-client';
import {
    Sprint,
    SprintItem,
    SprintMetrics,
    AIPlanRecommendation,
    VelocityTrend,
    BurndownData,
    TaskBreakdown
} from '../types/sprint';
import { Requirement } from '../types/requirement';

export const sprintsApi = {
    // Sprint Management
    list: () => api<Sprint[]>('/sprints'),
    get: (id: string) => api<Sprint>(`/sprints/${id}`),
    getActive: () => api<Sprint | null>('/sprints/active'),
    create: (data: Partial<Sprint>) => api<Sprint>('/sprints', { method: 'POST', body: data }),
    update: (id: string, data: Partial<Sprint>) =>
        api<Sprint>(`/sprints/${id}`, { method: 'PATCH', body: data }),
    updateStatus: (id: string, status: Sprint['status']) =>
        api<Sprint>(`/sprints/${id}/status`, { method: 'PATCH', body: { status } }),

    // Sprint Items
    getItems: (sprintId: string) => api<SprintItem[]>(`/sprints/${sprintId}/items`),
    getItem: (itemId: string) => api<SprintItem>(`/sprints/items/${itemId}`),
    getBacklogItems: () => api<SprintItem[]>('/sprints/backlog/items'),
    getStructuredBacklog: () => api<{ requirements: (Requirement & { tasks: SprintItem[] })[]; standaloneTasks: SprintItem[] }>('/sprints/backlog/structured'),
    addItem: (data: Partial<SprintItem>) =>
        api<SprintItem>('/sprints/items', { method: 'POST', body: data }),
    updateItem: (itemId: string, data: Partial<SprintItem>) =>
        api<SprintItem>(`/sprints/items/${itemId}`, { method: 'PATCH', body: data }),
    moveItem: (itemId: string, sprintId?: string, status?: SprintItem['status']) =>
        api<SprintItem>(`/sprints/items/${itemId}/move`, {
            method: 'PATCH',
            body: { sprintId, status },
        }),
    removeItem: (itemId: string) =>
        api(`/sprints/items/${itemId}`, { method: 'DELETE' }),

    // Sprint Metrics
    getMetrics: (sprintId: string) => api<SprintMetrics>(`/sprints/${sprintId}/metrics`),

    // AI Planning
    planSprint: (capacity?: number) =>
        api<AIPlanRecommendation>('/sprints/ai/plan', {
            method: 'POST',
            body: { capacity: capacity || 20 },
        }),

    // Velocity & Burndown
    calculateVelocity: (sprintId: string) =>
        api<number>(`/sprints/${sprintId}/velocity/calculate`, { method: 'POST' }),
    getVelocityTrend: () => api<VelocityTrend>('/sprints/velocity/trend'),
    getBurndown: (sprintId: string) => api<BurndownData>(`/sprints/${sprintId}/burndown`),

    // Requirement Import
    createItemsFromRequirements: (requirementIds: string[], sprintId?: string) =>
        api<SprintItem[]>('/sprints/items/from-requirements', {
            method: 'POST',
            body: { requirementIds, sprintId },
        }),
    generateTaskBreakdown: (requirementId: string, title: string, description: string) =>
        api<TaskBreakdown>('/sprints/items/task-breakdown', {
            method: 'POST',
            body: { requirementId, title, description },
        }),
};
