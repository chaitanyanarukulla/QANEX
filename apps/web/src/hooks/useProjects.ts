import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export interface Project {
  id: string;
  name: string;
  description?: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

const PROJECTS_KEY = ['projects'] as const;

/**
 * useProjects - Fetch all projects for current tenant
 */
export function useProjects() {
  return useQuery({
    queryKey: PROJECTS_KEY,
    queryFn: async () => api<Project[]>('/projects'),
  });
}

/**
 * useProject - Fetch single project by ID
 */
export function useProject(id: string | null) {
  return useQuery({
    queryKey: [PROJECTS_KEY, id],
    queryFn: async () => api<Project>(`/projects/${id}`),
    enabled: !!id,
  });
}

/**
 * useCreateProject - Create new project with optimistic updates
 */
export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Project>) => {
      return api<Project>('/projects', {
        method: 'POST',
        body: data,
        noCache: true,
      });
    },
    onSuccess: (newProject) => {
      queryClient.setQueryData(PROJECTS_KEY, (old: Project[] | undefined) => {
        return old ? [newProject, ...old] : [newProject];
      });
      queryClient.invalidateQueries({ queryKey: PROJECTS_KEY });
    },
  });
}

/**
 * useUpdateProject - Update existing project
 */
export function useUpdateProject(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Project>) => {
      return api<Project>(`/projects/${id}`, {
        method: 'PATCH',
        body: data,
        noCache: true,
      });
    },
    onSuccess: (updatedProject) => {
      queryClient.setQueryData([PROJECTS_KEY, id], updatedProject);
      queryClient.setQueryData(PROJECTS_KEY, (old: Project[] | undefined) => {
        return old?.map((proj) => (proj.id === id ? updatedProject : proj));
      });
    },
  });
}

/**
 * useDeleteProject - Delete project
 */
export function useDeleteProject(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      return api(`/projects/${id}`, {
        method: 'DELETE',
        noCache: true,
      });
    },
    onSuccess: () => {
      queryClient.setQueryData(PROJECTS_KEY, (old: Project[] | undefined) => {
        return old?.filter((proj) => proj.id !== id);
      });
      queryClient.invalidateQueries({ queryKey: PROJECTS_KEY });
    },
  });
}
