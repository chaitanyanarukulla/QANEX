
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
