// Requirement is currently in api.ts, I should probably put it in requirement.ts

export const SprintItemStatus = {
    TODO: 'todo',
    IN_PROGRESS: 'in_progress',
    CODE_REVIEW: 'code_review',
    READY_FOR_QA: 'ready_for_qa',
    IN_TESTING: 'in_testing',
    DONE: 'done',
    BACKLOG: 'backlog',
} as const;

export const SprintItemType = {
    FEATURE: 'feature',
    BUG: 'bug',
    TASK: 'task',
} as const;

export const SprintItemPriority = {
    CRITICAL: 'CRITICAL',
    HIGH: 'HIGH',
    MEDIUM: 'MEDIUM',
    LOW: 'LOW',
} as const;

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
