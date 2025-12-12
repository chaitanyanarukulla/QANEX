import { ApiError, ApiOptions } from '../types/api';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || '') + '/api';

// Response cache with TTL
const responseCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes default

// Request deduplication - track in-flight requests
const requestCache = new Map<string, Promise<unknown>>();

/**
 * Enhanced API client with:
 * - Automatic retries on transient failures
 * - Response caching for GET requests
 * - Request deduplication (same request = 1 API call)
 * - Timeout handling
 * - Exponential backoff on retries
 */
export async function api<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
    const {
        method = 'GET',
        body,
        headers = {},
        noCache = false,
        cacheTtl = CACHE_TTL,
        maxRetries = 3,
        timeout = 30000,
    } = options as ApiOptions & {
        noCache?: boolean;
        cacheTtl?: number;
        maxRetries?: number;
        timeout?: number;
    };

    const cacheKey = `${method}:${endpoint}:${JSON.stringify(body || {})}`;

    // Check cache for GET requests
    if (method === 'GET' && !noCache) {
        const cached = responseCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < cacheTtl) {
            return cached.data as T;
        }

        // Deduplication: if same request is in-flight, wait for it
        if (requestCache.has(cacheKey)) {
            try {
                return (await requestCache.get(cacheKey)) as T;
            } catch (_e) {
                // If dedup request failed, proceed with new request
            }
        }
    }

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

    // Retry logic with exponential backoff
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);

            const fetchPromise = (async () => {
                try {
                    const response = await fetch(`${API_BASE}${endpoint}`, {
                        ...config,
                        signal: controller.signal,
                    });

                    clearTimeout(timeoutId);

                    if (!response.ok) {
                        // Don't retry client errors (4xx)
                        if (response.status >= 400 && response.status < 500) {
                            const errorData = await response.json().catch(() => ({ message: 'Request failed' }));
                            throw new ApiError(response.status, errorData.message || 'Request failed');
                        }

                        // Retry server errors (5xx) and rate limits (429)
                        if (response.status === 429 || response.status >= 500) {
                            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                        }

                        const errorData = await response.json().catch(() => ({ message: 'Request failed' }));
                        throw new ApiError(response.status, errorData.message || 'Request failed');
                    }

                    // Parse response
                    const text = await response.text();
                    const data = text ? JSON.parse(text) : ({} as T);

                    // Cache GET responses
                    if (method === 'GET' && !noCache) {
                        responseCache.set(cacheKey, { data, timestamp: Date.now() });
                    }

                    return data as T;
                } finally {
                    clearTimeout(timeoutId);
                }
            })();

            // Track in-flight requests for deduplication
            if (method === 'GET' && !noCache) {
                requestCache.set(cacheKey, fetchPromise);
            }

            const result = await fetchPromise;

            // Clean up request cache after success
            if (method === 'GET' && !noCache) {
                requestCache.delete(cacheKey);
            }

            return result;
        } catch (error) {
            lastError = error as Error;

            // Don't retry on ApiError (client errors)
            if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
                requestCache.delete(cacheKey);
                throw error;
            }

            // Wait before retry (exponential backoff: 1s, 2s, 4s)
            if (attempt < maxRetries - 1) {
                const delayMs = Math.pow(2, attempt) * 1000;
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }
    }

    // Clean up request cache on failure
    requestCache.delete(cacheKey);

    // Throw the last error
    throw lastError || new Error('Request failed after retries');
}

/**
 * Invalidate cached responses
 * @param endpoint - Optional specific endpoint to invalidate, or leave empty to clear all cache
 */
export function invalidateCache(endpoint?: string): void {
    if (endpoint) {
        // Clear cache entries matching the endpoint
        for (const key of responseCache.keys()) {
            if (key.includes(endpoint)) {
                responseCache.delete(key);
            }
        }
    } else {
        // Clear entire cache
        responseCache.clear();
    }
}
