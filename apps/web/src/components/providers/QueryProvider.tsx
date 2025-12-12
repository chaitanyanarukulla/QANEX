'use client';

import { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/query-client';

/**
 * QueryProvider - Wraps app with TanStack Query configuration
 * Must be a client component to use QueryClientProvider
 *
 * Usage in layout:
 * <QueryProvider>
 *   {children}
 * </QueryProvider>
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
