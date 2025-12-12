import { api } from '../lib/api-client';
import { TenantUser } from '../types/user';

export const usersApi = {
    list: () => api<TenantUser[]>('/users'),
    invite: (data: { email: string; firstName: string; lastName: string; role: string }) =>
        api<TenantUser>('/users', { method: 'POST', body: data }),
    updateRole: (userId: string, role: string) =>
        api<TenantUser>(`/users/${userId}/role`, { method: 'PATCH', body: { role } }),
    delete: (userId: string) => api(`/users/${userId}`, { method: 'DELETE' }),
    update: (userId: string, data: Partial<TenantUser>) =>
        api<TenantUser>(`/users/${userId}`, { method: 'PATCH', body: data }),
};
