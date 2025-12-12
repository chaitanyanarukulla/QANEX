
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
