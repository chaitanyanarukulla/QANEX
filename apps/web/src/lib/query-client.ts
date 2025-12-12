import { QueryClient } from '@tanstack/react-query';

/**
 * Global TanStack Query Client Configuration
 *
 * Features:
 * - Optimized cache timing: 5 min stale, 10 min cache
 * - Automatic retries: 3 attempts with exponential backoff
 * - Request deduplication at network layer
 * - Garbage collection for unused queries
 *
 * Benefits over manual caching:
 * - Automatic background refetching
 * - Optimistic updates with rollback
 * - Built-in retry logic
 * - Request deduplication
 * - DevTools support for debugging
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 10 minutes
      staleTime: 5 * 60 * 1000, // Mark as stale after 5 min
      gcTime: 10 * 60 * 1000, // Keep in cache for 10 min

      // Retry failed requests
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

      // Request deduplication - refetch stale data
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchOnMount: true,
    },
    mutations: {
      // Retry mutations on network failures
      retry: 1,
      retryDelay: 1000,
    },
  },
});
