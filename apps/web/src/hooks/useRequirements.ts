import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { Requirement, CreateRequirementDto, UpdateRequirementDto } from '@/types/requirement';

const REQUIREMENTS_KEY = ['requirements'] as const;

/**
 * useRequirements - Fetch all requirements for current tenant
 *
 * Features:
 * - Automatic caching (5 min stale, 10 min TTL)
 * - Background refetch on focus/reconnect
 * - Automatic retry on failure
 * - Loading and error states
 *
 * Usage:
 * ```tsx
 * const { data, isLoading, error } = useRequirements();
 * ```
 */
export function useRequirements() {
  return useQuery({
    queryKey: REQUIREMENTS_KEY,
    queryFn: async () => api<Requirement[]>('/requirements'),
  });
}

/**
 * useRequirement - Fetch single requirement by ID
 *
 * Usage:
 * ```tsx
 * const { data: requirement } = useRequirement('req-123');
 * ```
 */
export function useRequirement(id: string | null) {
  return useQuery({
    queryKey: [REQUIREMENTS_KEY, id],
    queryFn: async () => api<Requirement>(`/requirements/${id}`),
    enabled: !!id, // Only fetch if ID is provided
  });
}

/**
 * useCreateRequirement - Create new requirement with optimistic updates
 *
 * Features:
 * - Optimistic update: immediately shows in list while request pending
 * - Automatic cache invalidation on success
 * - Rollback on error
 *
 * Usage:
 * ```tsx
 * const createMutation = useCreateRequirement();
 * await createMutation.mutateAsync({ title: '...', content: '...' });
 * ```
 */
export function useCreateRequirement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateRequirementDto) => {
      return api<Requirement>('/requirements', {
        method: 'POST',
        body: data,
        noCache: true,
      });
    },
    onSuccess: (newRequirement) => {
      // Add to cache optimistically
      queryClient.setQueryData(REQUIREMENTS_KEY, (old: Requirement[] | undefined) => {
        return old ? [newRequirement, ...old] : [newRequirement];
      });

      // Invalidate for fresh fetch
      queryClient.invalidateQueries({ queryKey: REQUIREMENTS_KEY });
    },
    onError: () => {
      // Cache is automatically rolled back by React Query
      queryClient.invalidateQueries({ queryKey: REQUIREMENTS_KEY });
    },
  });
}

/**
 * useUpdateRequirement - Update existing requirement
 *
 * Features:
 * - Optimistic update
 * - Selective cache invalidation (only affected requirement)
 * - Rollback on error
 *
 * Usage:
 * ```tsx
 * const updateMutation = useUpdateRequirement('req-123');
 * await updateMutation.mutateAsync({ state: 'APPROVED' });
 * ```
 */
export function useUpdateRequirement(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateRequirementDto) => {
      return api<Requirement>(`/requirements/${id}`, {
        method: 'PATCH',
        body: data,
        noCache: true,
      });
    },
    onSuccess: (updatedRequirement) => {
      // Update cache immediately
      queryClient.setQueryData([REQUIREMENTS_KEY, id], updatedRequirement);

      // Update in list
      queryClient.setQueryData(REQUIREMENTS_KEY, (old: Requirement[] | undefined) => {
        return old?.map((req) => (req.id === id ? updatedRequirement : req));
      });
    },
    onError: () => {
      // Invalidate on error to refetch fresh data
      queryClient.invalidateQueries({ queryKey: [REQUIREMENTS_KEY, id] });
      queryClient.invalidateQueries({ queryKey: REQUIREMENTS_KEY });
    },
  });
}

/**
 * useDeleteRequirement - Delete requirement
 *
 * Usage:
 * ```tsx
 * const deleteMutation = useDeleteRequirement('req-123');
 * await deleteMutation.mutateAsync();
 * ```
 */
export function useDeleteRequirement(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      return api(`/requirements/${id}`, {
        method: 'DELETE',
        noCache: true,
      });
    },
    onSuccess: () => {
      // Remove from cache
      queryClient.setQueryData(REQUIREMENTS_KEY, (old: Requirement[] | undefined) => {
        return old?.filter((req) => req.id !== id);
      });

      // Invalidate for fresh fetch
      queryClient.invalidateQueries({ queryKey: REQUIREMENTS_KEY });
    },
  });
}
