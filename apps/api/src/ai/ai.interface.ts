export interface AiProvider {
  analyzeRequirement(
    content: string,
    tenantId: string,
    apiKey?: string,
  ): Promise<{
    score: number;
    clarity: number;
    completeness: number;
    testability: number;
    consistency: number;
    feedback: string[];
  }>;

  triageBug(
    bugValues: { title: string; description: string },
    tenantId: string,
    apiKey?: string,
  ): Promise<{
    suggestedSeverity: string;
    suggestedPriority: string;
    duplicateCandidates: string[];
    rootCauseHypothesis: string;
  }>;

  generateTestCode(
    testCase: { title: string; steps: any[] },
    framework: string,
    tenantId: string,
    apiKey?: string,
  ): Promise<string>;

  callChat(prompt: string, tenantId: string, apiKey?: string): Promise<string>; // Keeping callChat simple for now or update it too?
  // Wait, AgenticRag uses callChat but doesn't log metrics yet effectively if it uses generic provider.
  // But wait, AgenticRagService has tenantId context. Ideally callChat should take tenantId too.
  // Let's update callChat as well.

  callChat(prompt: string, apiKey?: string): Promise<string>;

  explainRcs?(releaseInfo: { score: number; breakdown: any }): Promise<any>;

  // Future methods
  // suggestTests(requirement: string): Promise<any>;
  // generateRcsExplanation(score: number, breakdown: any): Promise<string>;
}

export const AI_PROVIDER_TOKEN = 'AI_PROVIDER_TOKEN';
