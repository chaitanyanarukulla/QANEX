import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { Sprint } from '@/types/sprint';

const SPRINTS_KEY = ['sprints'] as const;

/**
 * useSprints - Fetch all sprints for current tenant
 */
export function useSprints() {
  return useQuery({
    queryKey: SPRINTS_KEY,
    queryFn: async () => api<Sprint[]>('/sprints'),
  });
}

/**
 * useSprint - Fetch single sprint by ID
 */
export function useSprint(id: string | null) {
  return useQuery({
    queryKey: [SPRINTS_KEY, id],
    queryFn: async () => api<Sprint>(`/sprints/${id}`),
    enabled: !!id,
  });
}

/**
 * useCreateSprint - Create new sprint with optimistic updates
 */
export function useCreateSprint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Sprint>) => {
      return api<Sprint>('/sprints', {
        method: 'POST',
        body: data,
        noCache: true,
      });
    },
    onSuccess: (newSprint) => {
      queryClient.setQueryData(SPRINTS_KEY, (old: Sprint[] | undefined) => {
        return old ? [newSprint, ...old] : [newSprint];
      });
      queryClient.invalidateQueries({ queryKey: SPRINTS_KEY });
    },
  });
}

/**
 * useUpdateSprint - Update existing sprint
 */
export function useUpdateSprint(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Sprint>) => {
      return api<Sprint>(`/sprints/${id}`, {
        method: 'PATCH',
        body: data,
        noCache: true,
      });
    },
    onSuccess: (updatedSprint) => {
      queryClient.setQueryData([SPRINTS_KEY, id], updatedSprint);
      queryClient.setQueryData(SPRINTS_KEY, (old: Sprint[] | undefined) => {
        return old?.map((sprint) => (sprint.id === id ? updatedSprint : sprint));
      });
    },
  });
}

/**
 * useDeleteSprint - Delete sprint
 */
export function useDeleteSprint(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      return api(`/sprints/${id}`, {
        method: 'DELETE',
        noCache: true,
      });
    },
    onSuccess: () => {
      queryClient.setQueryData(SPRINTS_KEY, (old: Sprint[] | undefined) => {
        return old?.filter((sprint) => sprint.id !== id);
      });
      queryClient.invalidateQueries({ queryKey: SPRINTS_KEY });
    },
  });
}
