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

export interface VelocityTrend {
  sprints: Array<{
    sprintId: string;
    name: string;
    velocity: number;
    capacity: number;
    endDate: string | null;
  }>;
  averageVelocity: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

export interface BurndownData {
  totalItems: number;
  completedItems: number;
  remainingItems: number;
  dailyBurndown: Array<{
    date: string;
    remaining: number;
    ideal: number;
  }>;
  projectedCompletion: string | null;
}

export interface TaskBreakdown {
  suggestedTasks: Array<{
    title: string;
    description: string;
    type: 'feature' | 'bug' | 'task';
    estimatedHours: number;
  }>;
  totalEstimate: number;
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

export interface BugAnalysisResult {
  suggestedSeverity?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  suggestedPriority?: 'P0' | 'P1' | 'P2' | 'P3';
  analysis?: string;
}

// Bugs API
export const bugsApi = {
  list: () => api<Bug[]>('/bugs'),
  get: (id: string) => api<Bug>(`/bugs/${id}`),
  create: (data: Partial<Bug>) => api<Bug>('/bugs', { method: 'POST', body: data }),
  update: (id: string, data: Partial<Bug>) =>
    api<Bug>(`/bugs/${id}`, { method: 'PATCH', body: data }),
  delete: (id: string) => api(`/bugs/${id}`, { method: 'DELETE' }),
  triage: (id: string) => api<BugAnalysisResult>(`/bugs/${id}/triage`, { method: 'POST' }),
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

  // Option C: Velocity & Burndown
  calculateVelocity: (sprintId: string) =>
    api<number>(`/sprints/${sprintId}/velocity/calculate`, { method: 'POST' }),
  getVelocityTrend: () => api<VelocityTrend>('/sprints/velocity/trend'),
  getBurndown: (sprintId: string) => api<BurndownData>(`/sprints/${sprintId}/burndown`),

  // Option D: Requirement Import
  createItemsFromRequirements: (requirementIds: string[], sprintId?: string) =>
    api<SprintItem[]>('/sprints/items/from-requirements', {
      method: 'POST',
      body: { requirementIds, sprintId },
    }),
  generateTaskBreakdown: (requirementId: string, title: string, description: string) =>
    api<TaskBreakdown>('/sprints/items/task-breakdown', {
      method: 'POST',
      body: { requirementId, title, description },
    }),
};

// Release Gates Types
export interface ReleaseGate {
  name: string;
  type: 'rcs_score' | 'critical_bugs' | 'test_coverage' | 'requirements' | 'high_bugs';
  passed: boolean;
  required: boolean;
  message: string;
  score?: number;
  count?: number;
  percent?: number;
  threshold: number;
  details?: Record<string, unknown>[];
}

export interface ReleaseGatesEvaluation {
  canRelease: boolean;
  overrideApplied: boolean;
  overrideReason?: string;
  gates: ReleaseGate[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    requiredPassed: number;
    requiredTotal: number;
    optionalPassed: number;
    optionalTotal: number;
  };
  rcsScore: number;
  breakdown: {
    rp: number;
    qt: number;
    b: number;
    so: number;
  };
}

// Releases API
export const releasesApi = {
  list: () => api<Release[]>('/releases'),
  get: (id: string) => api<Release>(`/releases/${id}`),
  create: (data: Partial<Release>) => api<Release>('/releases', { method: 'POST', body: data }),
  update: (id: string, data: Partial<Release>) =>
    api<Release>(`/releases/${id}`, { method: 'PATCH', body: data }),
  calculateRcs: (id: string) => api<Release>(`/releases/${id}/rcs`, { method: 'POST' }),
  evaluateGates: (id: string, overrideReason?: string) =>
    api<ReleaseGatesEvaluation>(`/releases/${id}/evaluate-gates`, {
      method: 'POST',
      body: { overrideReason },
    }),
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
export interface AiProviderStats {
  calls: number;
  tokens: number;
  cost: number;
  avgLatency: number;
  models: Record<string, number>;
}

export interface AiModelCost {
  model: string;
  calls: number;
  tokens: number;
  cost: number;
}

export interface AiUsageByDate {
  date: string;
  tokens: number;
  cost: number;
  requests: number;
}

export interface AiUsageByProviderDate extends AiUsageByDate {
  provider: string;
}

export const metricsApi = {
  dashboard: () =>
    api<{
      project: {
        requirements: number;
        bugs: number;
        testCases: number;
        sprints: number;
      };
      ai: {
        totalCalls: number;
        avgLatency: number;
        totalCost: number;
        totalTokens: number;
        breakdown: {
          analyze: number;
          triage: number;
          codegen: number;
          chat: number;
          rcs: number;
          embedding: number;
        };
      };
    }>('/metrics/dashboard'),

  // AI usage history (daily aggregates)
  aiUsage: () => api<AiUsageByDate[]>('/metrics/ai/usage'),

  // Stats by provider
  aiProviders: () => api<Record<string, AiProviderStats>>('/metrics/ai/providers'),

  // Cost breakdown by model
  aiModels: () => api<AiModelCost[]>('/metrics/ai/models'),

  // Usage history by provider
  aiUsageByProvider: () => api<AiUsageByProviderDate[]>('/metrics/ai/usage/providers'),
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

// AI Provider Types
export type AIProviderType = 'openai' | 'gemini' | 'anthropic' | 'foundry_local';

export interface AICloudConfig {
  openai?: {
    apiKey: string;
    model: string;
    embeddingModel: string;
  };
  gemini?: {
    apiKey: string;
    model: string;
    embeddingModel: string;
  };
  anthropic?: {
    apiKey: string;
    model: string;
    embeddingProvider: 'openai' | 'foundry_local';
    embeddingApiKey?: string;
  };
}

export interface AIFoundryLocalConfig {
  endpoint: string;
  model: string;
  embeddingModel?: string;
}

export interface TenantAIConfig {
  provider?: AIProviderType;
  cloudConfig?: AICloudConfig;
  foundryLocalConfig?: AIFoundryLocalConfig;
}

// Tenants API
export interface TenantSettings {
  rqsThreshold?: number;
  rcsThresholds?: Record<string, number>;
  aiConfig?: TenantAIConfig;
}

export const tenantsApi = {
  get: (id: string) => api<{ id: string; settings: TenantSettings }>(`/tenants/${id}`),
  updateSettings: (id: string, settings: TenantSettings) =>
    api<{ settings: TenantSettings }>(`/tenants/${id}/settings`, {
      method: 'POST',
      body: settings,
    }),
};

// AI Provider Model Info
export interface AIModelInfo {
  id: string;
  name: string;
  provider: AIProviderType;
  description?: string;
  contextWindow: number;
  maxOutputTokens: number;
  costPer1kInput?: number;
  costPer1kOutput?: number;
  capabilities: string[];
  recommended?: boolean;
  category?: 'chat' | 'code' | 'embedding' | 'multimodal';
}

export interface AIProviderInfo {
  type: AIProviderType;
  name: string;
  category: 'cloud' | 'local';
  description: string;
  supportsEmbeddings: boolean;
  requiresApiKey: boolean;
  models: AIModelInfo[];
  setupInstructions?: string;
}

export interface AIConnectionTestResult {
  success: boolean;
  message: string;
  latencyMs?: number;
  modelInfo?: {
    id: string;
    name: string;
  };
}

export interface AIFoundryLocalStatus {
  running: boolean;
  endpoint?: string;
  loadedModels?: Record<string, unknown>[];
  hardwareInfo?: {
    accelerationType: 'CPU' | 'GPU' | 'NPU' | 'Unknown';
    loadedModels: Array<{ name: string; executionProvider: string }>;
  };
  error?: string;
}

// AI Settings API
export const aiSettingsApi = {
  getProviders: () => api<AIProviderInfo[]>('/ai/settings/providers'),

  testConnection: (provider: AIProviderType, credentials: { apiKey?: string; endpoint?: string }) =>
    api<AIConnectionTestResult>('/ai/settings/test-connection', {
      method: 'POST',
      body: { provider, ...credentials },
    }),

  getModels: (provider: AIProviderType) => api<AIModelInfo[]>(`/ai/settings/models/${provider}`),

  getFoundryLocalStatus: () => api<AIFoundryLocalStatus>('/ai/settings/foundry-local/status'),

  getFoundryLocalModels: () =>
    api<{ loaded: Record<string, unknown>[]; available: Record<string, unknown>[]; error?: string }>('/ai/settings/foundry-local/models'),

  getEmbeddingOptions: (provider: AIProviderType) =>
    api<{
      needsAlternative: boolean;
      message: string;
      options?: Array<{
        provider: string;
        name: string;
        requiresApiKey: boolean;
        models: AIModelInfo[];
      }>;
    }>(`/ai/settings/embedding-options/${provider}`),

  validateConfig: (config: {
    provider: AIProviderType;
    apiKey?: string;
    model?: string;
    endpoint?: string;
    embeddingProvider?: 'openai' | 'foundry_local';
    embeddingApiKey?: string;
  }) =>
    api<{
      valid: boolean;
      issues: string[];
      warnings: string[];
      connectionResult: AIConnectionTestResult;
    }>('/ai/settings/validate-config', {
      method: 'POST',
      body: config,
    }),
};

// Test Automation Types
export interface AutomationCandidate {
  id: string;
  testCaseId: string;
  testCaseTitle: string;
  status: 'NOT_STARTED' | 'PR_OPEN' | 'MERGED' | 'REJECTED';
  automationScore: number;
  executionCount: number;
  passRate: number;
  aiRecommendation: string;
  estimatedEffort: string;
  notes?: string;
  createdAt: string;
}

export interface AutomationCoverage {
  totalTests: number;
  automatedTests: number;
  automationRate: number;
  candidates: number;
  prOpen: number;
  merged: number;
  completionRate: number;
}

// Test Automation API
export const automationApi = {
  getCandidates: () => api<AutomationCandidate[]>('/automation/candidates'),
  getAISuggestions: (limit?: number) =>
    api<AutomationCandidate[]>(`/automation/candidates/ai-suggestions${limit ? `?limit=${limit}` : ''}`),
  getCoverage: () => api<AutomationCoverage>('/automation/coverage'),
  createCandidate: (testCaseId: string, notes?: string) =>
    api<AutomationCandidate>('/automation/candidates', {
      method: 'POST',
      body: { testCaseId, notes },
    }),
  generatePR: (candidateId: string) =>
    api<{ prUrl: string }>(`/automation/candidates/${candidateId}/generate-pr`, {
      method: 'POST',
    }),
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
  search: (query: string, mode: 'simple' | 'agentic' = 'simple') =>
    api<SearchResult[]>('/ai/search', { method: 'POST', body: { query, mode } }),
  listDocuments: () => api<SearchResult[]>('/ai/documents'),
  deleteDocument: (id: string) => api<{ status: string; id: string }>(`/ai/documents/${id}`, { method: 'DELETE' }),
  reindex: () => api<{ status: string; indexed: { total: number } }>('/ai/reindex', { method: 'POST' }),
};
