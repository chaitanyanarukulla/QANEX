# React Query Hooks for QANexus

This directory contains TanStack Query (React Query) hooks for managing data fetching, caching, and mutations in the QANexus frontend.

## Features

- **Automatic Caching**: GET requests cached for 10 minutes (5 min stale)
- **Request Deduplication**: Multiple identical requests = 1 API call
- **Optimistic Updates**: Immediately show changes while request is pending
- **Automatic Retry**: Failed requests retry up to 3 times with exponential backoff
- **Background Refetch**: Auto-refresh when tab regains focus or reconnects
- **Rollback on Error**: Cache automatically reverts if mutation fails

## Usage Examples

### Requirements

```tsx
// Fetch all requirements
const { data: requirements, isLoading, error } = useRequirements();

// Fetch single requirement
const { data: requirement } = useRequirement('req-123');

// Create requirement with optimistic update
const createMutation = useCreateRequirement();
async function handleCreate() {
  try {
    await createMutation.mutateAsync({
      title: 'New Feature',
      content: 'Add dark mode',
      state: 'DRAFT',
    });
    // Cache automatically updated!
  } catch (error) {
    // Show error, cache automatically rolled back
  }
}

// Update requirement
const updateMutation = useUpdateRequirement('req-123');
await updateMutation.mutateAsync({ state: 'APPROVED' });

// Delete requirement
const deleteMutation = useDeleteRequirement('req-123');
await deleteMutation.mutateAsync();
```

### Sprints

```tsx
const { data: sprints } = useSprints();
const createSprint = useCreateSprint();
const updateSprint = useUpdateSprint('sprint-123');
```

### Projects

```tsx
const { data: projects } = useProjects();
const createProject = useCreateProject();
const updateProject = useUpdateProject('project-123');
```

## Loading States

All queries and mutations provide loading states:

```tsx
const { data, isLoading, isPending, isError, error } = useRequirements();

if (isLoading) return <Skeleton />;
if (isError) return <Error message={error.message} />;
return <RequirementsList requirements={data} />;
```

For mutations:
```tsx
const mutation = useUpdateRequirement('req-123');

<button
  onClick={() => mutation.mutate(data)}
  disabled={mutation.isPending}
>
  {mutation.isPending ? 'Saving...' : 'Save'}
</button>
```

## Cache Invalidation

Manual cache invalidation (if needed):

```tsx
import { useQueryClient } from '@tanstack/react-query';

const queryClient = useQueryClient();

// Invalidate all requirements
queryClient.invalidateQueries({ queryKey: ['requirements'] });

// Invalidate specific requirement
queryClient.invalidateQueries({ queryKey: ['requirements', 'req-123'] });
```

## Adding New Hooks

Create a new hook file following the pattern:

```tsx
// src/hooks/useMyResource.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

const MY_RESOURCE_KEY = ['myResource'] as const;

export function useMyResources() {
  return useQuery({
    queryKey: MY_RESOURCE_KEY,
    queryFn: async () => api('/my-resources'),
  });
}
```

## Performance Tips

1. **Use `enabled` for dependent queries**:
   ```tsx
   useRequirement(id, { enabled: !!id });
   ```

2. **Set `noCache: true` for mutations**:
   ```tsx
   api('/endpoint', { method: 'POST', body: data, noCache: true })
   ```

3. **Avoid refetching unnecessary data**:
   ```tsx
   queryClient.setQueryData(['requirements', id], updated);
   // Instead of invalidateQueries (if the data is the same)
   ```

## DevTools

Install React Query DevTools to see cached data:

```tsx
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

export function App() {
  return (
    <>
      <YourApp />
      <ReactQueryDevtools initialIsOpen={false} />
    </>
  );
}
```

## Migration from Manual API Client

Before (manual caching):
```tsx
const [requirements, setRequirements] = useState([]);

useEffect(() => {
  api('/requirements').then(setRequirements);
}, []);

async function handleCreate(data) {
  await api('/requirements', { method: 'POST', body: data });
  // Manual: must call api again to refresh
  const fresh = await api('/requirements');
  setRequirements(fresh);
}
```

After (TanStack Query):
```tsx
const { data: requirements } = useRequirements();
const createMutation = useCreateRequirement();

async function handleCreate(data) {
  await createMutation.mutateAsync(data);
  // Automatic: cache automatically updated!
}
```

Much cleaner!
