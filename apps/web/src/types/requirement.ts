
import { SprintItem } from './sprint';
import { Document } from './document';

export interface Task {
  id?: string;
  title: string;
  description?: string;
  type?: 'feature' | 'bug' | 'task';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  suggestedRole?: string;
  estimatedHours?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AcceptanceCriteria {
  id?: string;
  description: string;
  requirementId?: string;
  createdAt?: Date;
}

export interface RQSScore {
  score: number;
  clarity: number;
  completeness: number;
  testability: number;
  consistency: number;
}

export interface Requirement {
    id: string;
    title: string;
    content: string;
    state: 'DRAFT' | 'PUBLISHED' | 'NEEDS_REVISION' | 'READY' | 'APPROVED' | 'BACKLOGGED' | 'COMPLETED';
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    type?: 'FUNCTIONAL' | 'NON_FUNCTIONAL' | 'BUG' | 'FEATURE' | 'ENHANCEMENT';
    acceptanceCriteria?: string[]; // Keep as string[] for backward compatibility with existing UI
    tasks?: Task[] | SprintItem[];
    rqs?: RQSScore;
    rqsScore?: number; // Legacy
    rqsBreakdown?: Record<string, number>; // Legacy
    sprintId?: string;
    sprintItems?: SprintItem[];
    parentId?: string;
    parent?: Requirement;
    children?: Requirement[];
    sourceDocumentId?: string;
    sourceDocument?: Document;
    tenantId?: string; // Optional for backward compatibility
    createdAt: string;
    updatedAt: string;
}

export interface CreateRequirementDto {
  title: string;
  content: string;
  state?: 'DRAFT' | 'APPROVED' | 'BACKLOGGED';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  type?: 'FUNCTIONAL' | 'NON_FUNCTIONAL' | 'BUG' | 'FEATURE' | 'ENHANCEMENT';
  acceptanceCriteria?: Array<{ description: string }>;
  tasks?: Task[];
  sourceDocumentId?: string;
}

export interface UpdateRequirementDto {
  title?: string;
  content?: string;
  state?: 'DRAFT' | 'APPROVED' | 'BACKLOGGED' | 'COMPLETED';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  type?: 'FUNCTIONAL' | 'NON_FUNCTIONAL' | 'BUG' | 'FEATURE' | 'ENHANCEMENT';
  acceptanceCriteria?: Array<{ description: string }>;
  tasks?: Task[];
  sourceDocumentId?: string;
}
