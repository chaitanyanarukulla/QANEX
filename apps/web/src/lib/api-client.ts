import { ApiError, ApiOptions } from '../types/api';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || '') + '/api';

export async function api<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
    const { method = 'GET', body, headers = {} } = options;

    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

    const config: RequestInit = {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...headers,
        },
    };

    if (body) {
        config.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_BASE}${endpoint}`, config);

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Request failed' }));
        throw new ApiError(response.status, errorData.message || 'Request failed');
    }

    // Handle empty responses
    const text = await response.text();
    if (!text) return {} as T;

    try {
        return JSON.parse(text);
    } catch (_e) {
        // Fallback if response is text but not JSON
        return text as unknown as T;
    }
}
