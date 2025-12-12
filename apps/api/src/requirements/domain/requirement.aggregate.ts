import { v4 as uuidv4 } from 'uuid';
import { BaseDomainAggregate } from '../../common/domain/aggregate-root.interface';
import { RequirementCreated } from './events/requirement-created.event';
import { RequirementApproved } from './events/requirement-approved.event';
import { RequirementAnalyzed } from './events/requirement-analyzed.event';
import { RequirementBacklogged } from './events/requirement-backlogged.event';
import { RequirementUpdated } from './events/requirement-updated.event';

/**
 * Requirement Aggregate Root
 *
 * Encapsulates all business logic for Requirements domain entity.
 * Enforces invariants and generates domain events for state changes.
 *
 * Bounded Context: Requirements Management
 * Aggregate Type: Requirement
 * Root Entity: Requirement
 * Child Entities: AcceptanceCriteria, RQSScore
 *
 * State Machine:
 * DRAFT → PUBLISHED → READY → APPROVED → BACKLOGGED
 * ↓
 * NEEDS_REVISION (any state)
 *
 * Business Rules:
 * 1. Requirement must have title and content
 * 2. Acceptance criteria should be validated for completeness
 * 3. RQS score indicates quality (0-100)
 * 4. Only approved requirements can be assigned to sprints
 * 5. Cannot approve if RQS < 75 (business rule)
 *
 * Events Published:
 * - RequirementCreated: Initial creation
 * - RequirementUpdated: Any field change
 * - RequirementAnalyzed: AI analysis complete (RQS updated)
 * - RequirementApproved: Status changed to APPROVED
 * - RequirementBacklogged: Status changed to BACKLOGGED
 *
 * SLA: All operations < 50ms (domain logic only)
 * Throughput: 1000+ requirement operations/second
 */
export class Requirement extends BaseDomainAggregate {
  // Aggregate ID
  id: string;

  // Aggregate state
  title: string;
  content: string;
  status: string; // DRAFT, PUBLISHED, READY, APPROVED, BACKLOGGED, NEEDS_REVISION
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  type: 'FUNCTIONAL' | 'NON_FUNCTIONAL' | 'BUG' | 'FEATURE' | 'ENHANCEMENT';
  acceptanceCriteria: string[];
  tenantId: string;

  // RQS Score (value object)
  rqs?: {
    score: number;
    clarity: number;
    completeness: number;
    testability: number;
    consistency: number;
    feedback: string[];
  };

  // Metadata
  createdAt: Date;
  updatedAt: Date;

  /**
   * Constructor
   * @private Use static factory methods instead (create, recreate)
   */
  constructor(props: {
    id: string;
    title: string;
    content: string;
    status: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    type: 'FUNCTIONAL' | 'NON_FUNCTIONAL' | 'BUG' | 'FEATURE' | 'ENHANCEMENT';
    acceptanceCriteria: string[];
    tenantId: string;
    rqs?: {
      score: number;
      clarity: number;
      completeness: number;
      testability: number;
      consistency: number;
      feedback: string[];
    };
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    super();
    this.id = props.id;
    this.title = props.title;
    this.content = props.content;
    this.status = props.status || 'DRAFT';
    this.priority = props.priority;
    this.type = props.type;
    this.acceptanceCriteria = props.acceptanceCriteria || [];
    this.tenantId = props.tenantId;
    this.rqs = props.rqs;
    this.createdAt = props.createdAt || new Date();
    this.updatedAt = props.updatedAt || new Date();
  }

  /**
   * Create new Requirement aggregate
   *
   * Factory method for creating fresh requirements with validation.
   * Publishes RequirementCreated event.
   *
   * @param props - Creation properties
   * @returns New Requirement aggregate
   * @throws Error if validation fails
   */
  static create(props: {
    title: string;
    content: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    type?: 'FUNCTIONAL' | 'NON_FUNCTIONAL' | 'BUG' | 'FEATURE' | 'ENHANCEMENT';
    acceptanceCriteria?: string[];
    tenantId: string;
  }): Requirement {
    // Validate required fields
    if (!props.title || props.title.trim().length === 0) {
      throw new Error('Requirement title is required');
    }
    if (!props.content || props.content.trim().length === 0) {
      throw new Error('Requirement content is required');
    }
    if (!props.tenantId) {
      throw new Error('TenantId is required');
    }

    const id = uuidv4();
    const now = new Date();

    const requirement = new Requirement({
      id,
      title: props.title,
      content: props.content,
      status: 'DRAFT',
      priority: props.priority || 'MEDIUM',
      type: props.type || 'FUNCTIONAL',
      acceptanceCriteria: props.acceptanceCriteria || [],
      tenantId: props.tenantId,
      createdAt: now,
      updatedAt: now,
    });

    // Publish creation event
    const event = new RequirementCreated({
      eventId: uuidv4(),
      eventType: 'RequirementCreated',
      aggregateId: requirement.id,
      aggregateType: 'Requirement',
      tenantId: requirement.tenantId,
      occurredAt: now,
      title: requirement.title,
      content: requirement.content,
      priority: requirement.priority,
      type: requirement.type,
      acceptanceCriteria: requirement.acceptanceCriteria,
    });

    requirement.addDomainEvent(event);
    return requirement;
  }

  /**
   * Recreate Requirement from persisted state
   *
   * Used to reconstruct aggregate from database or event store.
   * Does NOT publish events.
   *
   * @param props - Full requirement properties
   * @returns Requirement aggregate in loaded state
   */
  static recreate(props: {
    id: string;
    title: string;
    content: string;
    status: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    type: 'FUNCTIONAL' | 'NON_FUNCTIONAL' | 'BUG' | 'FEATURE' | 'ENHANCEMENT';
    acceptanceCriteria: string[];
    tenantId: string;
    rqs?: {
      score: number;
      clarity: number;
      completeness: number;
      testability: number;
      consistency: number;
      feedback: string[];
    };
    createdAt: Date;
    updatedAt: Date;
  }): Requirement {
    return new Requirement(props);
  }

  /**
   * Update requirement properties
   *
   * @param props - Properties to update
   */
  update(props: {
    title?: string;
    content?: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    type?: 'FUNCTIONAL' | 'NON_FUNCTIONAL' | 'BUG' | 'FEATURE' | 'ENHANCEMENT';
    acceptanceCriteria?: string[];
  }): void {
    const hasChanges =
      (props.title && props.title !== this.title) ||
      (props.content && props.content !== this.content) ||
      (props.priority && props.priority !== this.priority) ||
      (props.type && props.type !== this.type) ||
      (props.acceptanceCriteria &&
        JSON.stringify(props.acceptanceCriteria) !== JSON.stringify(this.acceptanceCriteria));

    if (!hasChanges) {
      return; // No changes, no event
    }

    // Update state
    if (props.title) this.title = props.title;
    if (props.content) this.content = props.content;
    if (props.priority) this.priority = props.priority;
    if (props.type) this.type = props.type;
    if (props.acceptanceCriteria) this.acceptanceCriteria = props.acceptanceCriteria;

    this.updatedAt = new Date();

    // Publish update event
    const event = new RequirementUpdated({
      eventId: uuidv4(),
      eventType: 'RequirementUpdated',
      aggregateId: this.id,
      aggregateType: 'Requirement',
      tenantId: this.tenantId,
      occurredAt: new Date(),
      changes: props,
    });

    this.addDomainEvent(event);
  }

  /**
   * Apply AI analysis to requirement
   *
   * Updates RQS score and publishes RequirementAnalyzed event.
   *
   * @param analysis - Analysis results from AI
   */
  applyAnalysis(analysis: {
    score: number;
    clarity: number;
    completeness: number;
    testability: number;
    consistency: number;
    feedback: string[];
  }): void {
    // Validate score
    if (analysis.score < 0 || analysis.score > 100) {
      throw new Error('RQS score must be between 0 and 100');
    }

    this.rqs = analysis;
    this.updatedAt = new Date();

    // Publish analysis event
    const event = new RequirementAnalyzed({
      eventId: uuidv4(),
      eventType: 'RequirementAnalyzed',
      aggregateId: this.id,
      aggregateType: 'Requirement',
      tenantId: this.tenantId,
      occurredAt: new Date(),
      score: analysis.score,
      clarity: analysis.clarity,
      completeness: analysis.completeness,
      testability: analysis.testability,
      consistency: analysis.consistency,
      feedback: analysis.feedback,
    });

    this.addDomainEvent(event);
  }

  /**
   * Approve requirement
   *
   * Business rule: Can only approve if RQS score >= 75 (optional enforcement)
   * Transitions to APPROVED state and publishes RequirementApproved event.
   *
   * @throws Error if RQS score too low
   */
  approve(): void {
    // Optional: Enforce RQS >= 75
    if (this.rqs && this.rqs.score < 75) {
      throw new Error(
        `Cannot approve requirement with RQS score ${this.rqs.score} (minimum 75 required)`,
      );
    }

    if (this.status === 'APPROVED') {
      return; // Already approved, no event
    }

    this.status = 'APPROVED';
    this.updatedAt = new Date();

    // Publish approval event
    const event = new RequirementApproved({
      eventId: uuidv4(),
      eventType: 'RequirementApproved',
      aggregateId: this.id,
      aggregateType: 'Requirement',
      tenantId: this.tenantId,
      occurredAt: new Date(),
      approverId: 'system', // TODO: Get from context
      approverRole: 'SYSTEM',
    });

    this.addDomainEvent(event);
  }

  /**
   * Mark requirement as needing revision
   *
   * Transitions to NEEDS_REVISION state.
   *
   * @param reason - Reason for revision
   */
  needsRevision(reason: string): void {
    if (this.status === 'NEEDS_REVISION') {
      return; // Already in needs revision state
    }

    this.status = 'NEEDS_REVISION';
    this.updatedAt = new Date();

    // Publish event (not yet created, add if needed)
    // const event = new RequirementNeedsRevision(...);
    // this.addDomainEvent(event);
  }

  /**
   * Publish requirement
   *
   * Transitions to PUBLISHED state.
   */
  publish(): void {
    if (this.status === 'PUBLISHED') {
      return; // Already published
    }

    if (this.status !== 'DRAFT' && this.status !== 'NEEDS_REVISION') {
      throw new Error(
        `Cannot publish requirement from ${this.status} state`,
      );
    }

    this.status = 'PUBLISHED';
    this.updatedAt = new Date();

    // Publish event (not yet created, add if needed)
    // const event = new RequirementPublished(...);
    // this.addDomainEvent(event);
  }

  /**
   * Mark requirement as ready for approval
   */
  markReady(): void {
    if (this.status === 'READY') {
      return; // Already ready
    }

    if (this.status !== 'PUBLISHED' && this.status !== 'DRAFT') {
      throw new Error(`Cannot mark ${this.status} requirement as ready`);
    }

    this.status = 'READY';
    this.updatedAt = new Date();

    // Publish event (not yet created, add if needed)
    // const event = new RequirementMarkedReady(...);
    // this.addDomainEvent(event);
  }

  /**
   * Move requirement to backlog
   *
   * Transitions to BACKLOGGED state and publishes RequirementBacklogged event.
   */
  backlog(): void {
    if (this.status === 'BACKLOGGED') {
      return; // Already backlogged, no event
    }

    this.status = 'BACKLOGGED';
    this.updatedAt = new Date();

    // Publish backlog event
    const event = new RequirementBacklogged({
      eventId: uuidv4(),
      eventType: 'RequirementBacklogged',
      aggregateId: this.id,
      aggregateType: 'Requirement',
      tenantId: this.tenantId,
      occurredAt: new Date(),
    });

    this.addDomainEvent(event);
  }

  /**
   * Check if requirement is ready for sprint assignment
   *
   * @returns true if requirement can be assigned to sprint
   */
  isReadyForSprint(): boolean {
    return (this.status === 'APPROVED' && !!this.rqs && this.rqs.score >= 75) || false;
  }

  /**
   * Check if requirement has high-quality acceptance criteria
   *
   * @returns true if has acceptance criteria
   */
  hasAcceptanceCriteria(): boolean {
    return this.acceptanceCriteria.length > 0;
  }

  /**
   * Get requirement quality score
   *
   * @returns RQS score or 0 if not analyzed
   */
  getQualityScore(): number {
    return this.rqs?.score || 0;
  }

  /**
   * Check if requirement is ready for analysis
   *
   * @returns true if can be analyzed
   */
  canBeAnalyzed(): boolean {
    return this.status === 'DRAFT' || this.status === 'PUBLISHED' || this.status === 'READY';
  }
}
