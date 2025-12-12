import { api } from '../lib/api-client';
import { User } from '../types/user';

export const authApi = {
    login: (email: string, name?: string) =>
        api<{ access_token: string; user: User }>('/auth/login', {
            method: 'POST',
            body: { email, sub: email, name },
        }),

    me: () => api<User>('/auth/me'),
};
