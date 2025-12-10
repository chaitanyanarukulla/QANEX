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
  goal?: string;
  status: 'PLANNED' | 'ACTIVE' | 'COMPLETED';
  startDate?: string;
  endDate?: string;
  capacity?: number;
  createdAt: string;
  updatedAt: string;
}

export interface SprintItem {
  id: string;
  sprintId?: string;
  requirementId?: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'code_review' | 'ready_for_qa' | 'in_testing' | 'done' | 'backlog';
  type: 'feature' | 'bug' | 'task';
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  rqsScore?: number;
  assigneeId?: string;
  assigneeName?: string;
  estimatedHours?: number;
  actualHours?: number;
  createdAt: string;
  updatedAt: string;
}

export interface SprintMetrics {
  total: number;
  done: number;
  inProgress: number;
  todo: number;
  inTesting: number;
  codeReview: number;
  readyForQa: number;
  progress: number;
  byPriority: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  byType: {
    feature: number;
    bug: number;
    task: number;
  };
  avgRqsScore: number | null;
}

export interface AIPlanRecommendation {
  recommendedItems: Array<{
    item: SprintItem;
    reason: string;
    score: number;
  }>;
  totalRecommended: number;
  capacityUtilized: number;
  reasoning: string;
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
    details?: {
      openBugs: number;
      readyReqs: number;
      totalReqs: number;
    };
  };
  rcsExplanation?: {
    summary: string;
    risks: string[];
    strengths: string[];
    generatedAt: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface TestStep {
  step: string;
  expected: string;
}

export interface TestCase {
  id: string;
  title: string;
  description?: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  steps?: TestStep[];
  requirementId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TestRunStats {
  total: number;
  passed: number;
  failed: number;
  blocked: number;
  skipped: number;
  passRate: number;
}

export interface TestRun {
  id: string;
  name: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  stats: TestRunStats;
  createdAt: string;
  updatedAt: string;
}

export interface TestResult {
  id: string;
  runId: string;
  caseId: string;
  status: 'PASS' | 'FAIL' | 'BLOCKED' | 'SKIPPED';
  notes?: string;
  createdAt: string;
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
  // Sprint Management
  list: () => api<Sprint[]>('/sprints'),
  get: (id: string) => api<Sprint>(`/sprints/${id}`),
  getActive: () => api<Sprint | null>('/sprints/active'),
  create: (data: Partial<Sprint>) => api<Sprint>('/sprints', { method: 'POST', body: data }),
  update: (id: string, data: Partial<Sprint>) =>
    api<Sprint>(`/sprints/${id}`, { method: 'PATCH', body: data }),
  updateStatus: (id: string, status: Sprint['status']) =>
    api<Sprint>(`/sprints/${id}/status`, { method: 'PATCH', body: { status } }),

  // Sprint Items
  getItems: (sprintId: string) => api<SprintItem[]>(`/sprints/${sprintId}/items`),
  getBacklogItems: () => api<SprintItem[]>('/sprints/backlog/items'),
  addItem: (data: Partial<SprintItem>) =>
    api<SprintItem>('/sprints/items', { method: 'POST', body: data }),
  updateItem: (itemId: string, data: Partial<SprintItem>) =>
    api<SprintItem>(`/sprints/items/${itemId}`, { method: 'PATCH', body: data }),
  moveItem: (itemId: string, sprintId?: string, status?: SprintItem['status']) =>
    api<SprintItem>(`/sprints/items/${itemId}/move`, {
      method: 'PATCH',
      body: { sprintId, status },
    }),
  removeItem: (itemId: string) =>
    api(`/sprints/items/${itemId}`, { method: 'DELETE' }),

  // Sprint Metrics
  getMetrics: (sprintId: string) => api<SprintMetrics>(`/sprints/${sprintId}/metrics`),

  // AI Planning
  planSprint: (capacity?: number) =>
    api<AIPlanRecommendation>('/sprints/ai/plan', {
      method: 'POST',
      body: { capacity: capacity || 20 },
    }),
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
  list: () => api<TestCase[]>('/tests/cases'),
  get: (id: string) => api<TestCase>(`/tests/cases/${id}`),
  create: (data: Partial<TestCase>) => api<TestCase>('/tests/cases', { method: 'POST', body: data }),
  update: (id: string, data: Partial<TestCase>) =>
    api<TestCase>(`/tests/cases/${id}`, { method: 'PATCH', body: data }),
  delete: (id: string) => api(`/tests/cases/${id}`, { method: 'DELETE' }),
};

// Test Runs API
export const testRunsApi = {
  list: () => api<TestRun[]>('/tests/runs'),
  get: (id: string) => api<TestRun>(`/tests/runs/${id}`),
  create: (name: string) => api<TestRun>('/tests/runs', { method: 'POST', body: { name } }),
  start: (id: string) => api<TestRun>(`/tests/runs/${id}/start`, { method: 'POST' }),
  complete: (id: string) => api<TestRun>(`/tests/runs/${id}/complete`, { method: 'POST' }),
  getResults: (id: string) => api<TestResult[]>(`/tests/runs/${id}/results`),
  recordResult: (runId: string, caseId: string, status: TestResult['status'], notes?: string) =>
    api<TestResult>(`/tests/runs/${runId}/results`, { method: 'POST', body: { caseId, status, notes } }),
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

// Search Result Interface
export interface SearchResult {
  id: string;
  type: 'REQUIREMENT' | 'BUG' | 'TEST' | 'RELEASE';
  content: string;
  metadata: {
    title?: string;
    [key: string]: unknown;
  };
}

// AI/RAG API
export const aiApi = {
  search: (query: string) =>
    api<SearchResult[]>('/ai/search', { method: 'POST', body: { query } }),
};
