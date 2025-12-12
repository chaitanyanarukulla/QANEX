
import { SprintItem } from './sprint';
import { Document } from './document';

export interface Requirement {
    id: string;
    title: string;
    content: string;
    state: 'DRAFT' | 'PUBLISHED' | 'NEEDS_REVISION' | 'READY' | 'APPROVED' | 'BACKLOGGED';
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    type?: 'FUNCTIONAL' | 'NON_FUNCTIONAL' | 'BUG' | 'FEATURE' | 'ENHANCEMENT';
    acceptanceCriteria?: string[];
    rqsScore?: number;
    rqsBreakdown?: Record<string, number>;
    sprintId?: string;
    sprintItems?: SprintItem[];
    parentId?: string;
    parent?: Requirement;
    children?: Requirement[];
    sourceDocumentId?: string;
    sourceDocument?: Document;
    createdAt: string;
    updatedAt: string;
}
