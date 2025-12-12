
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

export interface BugAnalysisResult {
    suggestedSeverity?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    suggestedPriority?: 'P0' | 'P1' | 'P2' | 'P3';
    analysis?: string;
}
