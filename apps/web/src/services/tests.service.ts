import { api } from '../lib/api-client';
import { TestCase, TestRun, TestResult } from '../types/tests';

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
