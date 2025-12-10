const API_BASE = '/api';

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

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

  return JSON.parse(text);
}

// Auth API
export const authApi = {
  login: (email: string, name?: string) =>
    api<{ access_token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: { email, sub: email, name },
    }),

  me: () => api<User>('/auth/me'),
};

// Types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  defaultTenantId: string;
}

export interface Requirement {
  id: string;
  title: string;
  description: string;
  state: 'DRAFT' | 'PUBLISHED' | 'NEEDS_REVISION' | 'READY';
  rqsScore?: number;
  rqsBreakdown?: Record<string, number>;
  sprintId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Bug {
  id: string;
  title: string;
  description: string;
  status: 'NEW' | 'TRIAGED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  createdAt: string;
  updatedAt: string;
}

export interface Sprint {
  id: string;
  name: string;
  status: 'PLANNED' | 'ACTIVE' | 'COMPLETED';
  startDate?: string;
  endDate?: string;
  capacity?: number;
}

export interface Release {
  id: string;
  version: string;
  name: string;
  status: 'PLANNED' | 'ACTIVE' | 'FROZEN' | 'RELEASED' | 'ABORTED';
  rcsScore?: number;
  rcsBreakdown?: {
    rp: number;
    qt: number;
    b: number;
    so: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface TestCase {
  id: string;
  title: string;
  description?: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  requirementId?: string;
}

// Requirements API
export const requirementsApi = {
  list: () => api<Requirement[]>('/requirements'),
  get: (id: string) => api<Requirement>(`/requirements/${id}`),
  create: (data: Partial<Requirement>) =>
    api<Requirement>('/requirements', { method: 'POST', body: data }),
  update: (id: string, data: Partial<Requirement>) =>
    api<Requirement>(`/requirements/${id}`, { method: 'PATCH', body: data }),
  delete: (id: string) => api(`/requirements/${id}`, { method: 'DELETE' }),
  analyze: (id: string) => api<Requirement>(`/requirements/${id}/analyze`, { method: 'POST' }),
};

// Bugs API
export const bugsApi = {
  list: () => api<Bug[]>('/bugs'),
  get: (id: string) => api<Bug>(`/bugs/${id}`),
  create: (data: Partial<Bug>) => api<Bug>('/bugs', { method: 'POST', body: data }),
  update: (id: string, data: Partial<Bug>) =>
    api<Bug>(`/bugs/${id}`, { method: 'PATCH', body: data }),
  delete: (id: string) => api(`/bugs/${id}`, { method: 'DELETE' }),
  triage: (id: string) => api<Bug>(`/bugs/${id}/triage`, { method: 'POST' }),
};

// Sprints API
export const sprintsApi = {
  list: () => api<Sprint[]>('/sprints'),
  get: (id: string) => api<Sprint>(`/sprints/${id}`),
  create: (data: Partial<Sprint>) => api<Sprint>('/sprints', { method: 'POST', body: data }),
  update: (id: string, data: Partial<Sprint>) =>
    api<Sprint>(`/sprints/${id}`, { method: 'PATCH', body: data }),
};

// Releases API
export const releasesApi = {
  list: () => api<Release[]>('/releases'),
  get: (id: string) => api<Release>(`/releases/${id}`),
  create: (data: Partial<Release>) => api<Release>('/releases', { method: 'POST', body: data }),
  update: (id: string, data: Partial<Release>) =>
    api<Release>(`/releases/${id}`, { method: 'PATCH', body: data }),
  calculateRcs: (id: string) => api<Release>(`/releases/${id}/rcs`, { method: 'POST' }),
};

// Test Cases API
export const testCasesApi = {
  list: () => api<TestCase[]>('/test-keys'),
  get: (id: string) => api<TestCase>(`/test-keys/${id}`),
  create: (data: Partial<TestCase>) => api<TestCase>('/test-keys', { method: 'POST', body: data }),
  update: (id: string, data: Partial<TestCase>) =>
    api<TestCase>(`/test-keys/${id}`, { method: 'PATCH', body: data }),
};

// Dashboard/Metrics API
export const metricsApi = {
  dashboard: () => api<{
    avgRqs: number;
    bugDensity: number;
    totalAiInteractions: number;
    avgAiLatency: number;
    aiUsageBreakdown: { action: string; count: number }[];
  }>('/metrics/dashboard'),
};

// Onboarding API
export const onboardingApi = {
  checklist: () => api<{
    items: { id: string; label: string; completed: boolean; ctaPath?: string }[];
    progress: number;
  }>('/onboarding/checklist'),
};

// Demo API
export const demoApi = {
  createProject: () => api('/demo/project', { method: 'POST' }),
};
