import { api } from '../lib/api-client';
import { Document, DocumentAIReview } from '../types/document';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || '') + '/api';

export const documentsApi = {
    list: () => api<Document[]>('/documents'),
    get: (id: string) => api<Document>(`/documents/${id}`),
    create: (data: { title: string; content: string; source?: string }) =>
        api<Document>('/documents', { method: 'POST', body: data }),
    update: (id: string, data: Partial<Document>) =>
        api<Document>(`/documents/${id}`, { method: 'PATCH', body: data }),
    delete: (id: string) => api(`/documents/${id}`, { method: 'DELETE' }),
    analyze: (id: string) => api<DocumentAIReview>(`/documents/${id}/analyze`, { method: 'POST' }),
    snapshot: (id: string) => api(`/documents/${id}/snapshot`, { method: 'POST' }),
    upload: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

        const response = await fetch(`${API_BASE}/documents/upload`, {
            method: 'POST',
            headers: {
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: formData,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Upload failed' }));
            throw new Error(error.message || 'Upload failed');
        }
        return response.json() as Promise<Document>;
    },
    importConfluence: (data: { siteUrl: string; email: string; apiToken: string; pageId: string }) =>
        api<Document>('/documents/import/confluence', { method: 'POST', body: data }),
};
