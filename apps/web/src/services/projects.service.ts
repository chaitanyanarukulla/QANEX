import { api } from '../lib/api-client';
import { Project } from '../types/project';

export const projectsApi = {
    list: () => api<Project[]>('/projects'),
    get: (id: string) => api<Project>(`/projects/${id}`),
    create: (data: Partial<Project>) => api<Project>('/projects', { method: 'POST', body: data }),
    update: (id: string, data: Partial<Project>) => api<Project>(`/projects/${id}`, { method: 'PATCH', body: data }),
    delete: (id: string) => api(`/projects/${id}`, { method: 'DELETE' }),
};
