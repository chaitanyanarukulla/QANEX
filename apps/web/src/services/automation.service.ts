import { api } from '../lib/api-client';
import { AutomationCandidate, AutomationCoverage } from '../types/tests';

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
