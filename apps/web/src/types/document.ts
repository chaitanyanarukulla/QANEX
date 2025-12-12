
export interface DocumentAIReview {
    id?: string;
    score?: number;
    summary: string;
    risks?: { risk: string; severity: 'LOW' | 'MEDIUM' | 'HIGH'; mitigation: string }[];
    gaps?: { gap: string; suggestion: string }[];
    suggestions: string[];
    generatedAt: string;
}

export enum DocumentStatus {
    DRAFT = 'DRAFT',
    IN_REVIEW = 'IN_REVIEW',
    AI_ANALYZING = 'AI_ANALYZING',
    FIXING_GAPS = 'FIXING_GAPS',
    READY_FOR_IMPLEMENTATION = 'READY_FOR_IMPLEMENTATION',
    FINAL = 'FINAL',
    ARCHIVED = 'ARCHIVED',
}

export interface Document {
    id: string;
    title: string;
    content: string;
    status: DocumentStatus;
    source: 'MANUAL' | 'UPLOAD' | 'CONFLUENCE';
    sourceUrl?: string;
    description?: string;
    tags?: string[];
    version?: string;
    tenantId: string;
    authorId?: string;
    createdAt: string;
    updatedAt: string;
    aiReview?: DocumentAIReview;
    requirementsCount?: number;
}
