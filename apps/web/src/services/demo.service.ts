import { api } from '../lib/api-client';

export const demoApi = {
    createProject: () => api('/demo/project', { method: 'POST' }),
};
