
export interface DashboardMetrics {
    project: {
        requirements?: number;
        totalRequirements?: number;
        avgRqs: number;
        bugs?: number;
        totalBugs?: number;
        openBugs?: number;
        testCases?: number;
        sprints?: number;
        bugDensity: string | number;
        testPassRate?: number;
    };
    ai: {
        totalCalls?: number;
        totalInteractions?: number;
        avgLatency: number;
        totalCost?: number;
        totalTokens?: number;
        breakdown: {
            analyze: number;
            triage: number;
            codegen?: number;
            chat?: number;
            rcs?: number;
            embedding?: number;
        };
    };
}
