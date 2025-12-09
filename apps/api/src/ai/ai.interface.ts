export interface AiProvider {
    analyzeRequirement(content: string): Promise<{
        score: number;
        clarity: number;
        completeness: number;
        testability: number;
        consistency: number;
        feedback: string[];
    }>;

    triageBug(bugValues: { title: string; description: string }): Promise<{
        suggestedSeverity: string;
        suggestedPriority: string;
        duplicateCandidates: string[];
        rootCauseHypothesis: string;
    }>;

    generateTestCode(testCase: { title: string; steps: any[] }, framework: string): Promise<string>;
    explainRcs?(releaseInfo: { score: number; breakdown: any }): Promise<any>;

    // Future methods
    // suggestTests(requirement: string): Promise<any>;
    // generateRcsExplanation(score: number, breakdown: any): Promise<string>;
}

export const AI_PROVIDER_TOKEN = 'AI_PROVIDER_TOKEN';
