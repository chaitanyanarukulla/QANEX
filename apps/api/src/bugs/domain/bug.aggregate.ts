import { BaseDomainAggregate } from '../../common/domain/aggregate-root.interface';
import {
  BugSeverityLevel,
  BugSeverityHelper,
} from './value-objects/bug-severity.vo';
import {
  BugPriorityLevel,
  BugPriorityHelper,
} from './value-objects/bug-priority.vo';
import { BugStatusType, BugStatusHelper } from './value-objects/bug-status.vo';
import { BugCreated } from './events/bug-created.event';
import { BugTriaged } from './events/bug-triaged.event';
import { BugResolved } from './events/bug-resolved.event';
import { BugReopened } from './events/bug-reopened.event';

/**
 * Bug Aggregate Root
 *
 * Represents a software defect or issue in the system and manages its lifecycle.
 * Coordinates bug triage, fix tracking, and release impact analysis.
 *
 * Invariants (Domain Rules):
 * 1. Bug ID must be unique per tenant
 * 2. Bug can only transition through valid states (enforced by BugStatusHelper)
 * 3. Critical bugs block release until resolved
 * 4. P0 bugs must be fixed before release
 * 5. Bug severity and priority are independent dimensions
 * 6. Cannot modify resolved/closed/deferred bugs (terminal states)
 *
 * Domain Events Published:
 * - BugCreated: New bug reported
 * - BugTriaged: Severity/priority assigned
 * - BugResolved: Fix implemented
 * - BugReopened: QA found issues in resolved fix
 *
 * Cross-Context Integration:
 * - Release context: Bugs affect ReleaseConfidenceScore
 * - Sprint context: Bug count/severity affects sprint metrics
 * - Test context: Test failures may create bugs
 *
 * Example:
 * ```typescript
 * const bug = Bug.create({
 *   id: 'bug-1',
 *   tenantId: 'tenant-1',
 *   title: 'Login fails for SSO users',
 *   description: 'Users with SSO configured cannot log in',
 *   reportedBy: 'user-1',
 * });
 *
 * // Triage: set severity and priority
 * bug.triage({
 *   severity: BugSeverityLevel.HIGH,
 *   priority: BugPriorityLevel.P1,
 *   assignedTo: 'dev-1',
 * });
 *
 * // Work on fix
 * bug.markInProgress();
 * bug.markResolved('Fixed SSO token validation');
 *
 * // If QA finds issues
 * bug.reopen('SSO still failing for specific case');
 *
 * // Save and publish
 * await repo.save(bug);
 * await eventPublisher.publishAll(bug.getDomainEvents());
 * ```
 */
export class Bug extends BaseDomainAggregate {
  public id: string;
  public tenantId: string;
  public title: string;
  public description: string;
  public status: BugStatusType;
  public severity?: BugSeverityLevel;
  public priority?: BugPriorityLevel;
  public reportedBy: string;
  public assignedTo?: string;
  public tags: string[] = [];
  public createdAt: Date;
  public updatedAt: Date;
  public triageDate?: Date;
  public resolvedDate?: Date;
  public closedDate?: Date;

  constructor(
    id: string,
    tenantId: string,
    title: string,
    description: string,
    reportedBy: string,
  ) {
    super();
    this.id = id;
    this.tenantId = tenantId;
    this.title = title;
    this.description = description;
    this.reportedBy = reportedBy;
    this.status = BugStatusType.OPEN;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Factory method to create a new bug.
   * Publishes BugCreated event.
   */
  public static create(params: {
    id: string;
    tenantId: string;
    title: string;
    description: string;
    reportedBy: string;
    tags?: string[];
  }): Bug {
    if (!params.title || params.title.trim().length === 0) {
      throw new Error('Bug title is required');
    }

    if (!params.description || params.description.trim().length === 0) {
      throw new Error('Bug description is required');
    }

    const bug = new Bug(
      params.id,
      params.tenantId,
      params.title,
      params.description,
      params.reportedBy,
    );

    if (params.tags) {
      bug.tags = params.tags;
    }

    // Publish domain event
    bug.addDomainEvent(
      new BugCreated(bug.id, bug.tenantId, {
        title: bug.title,
        description: bug.description,
        reportedBy: bug.reportedBy,
        tags: bug.tags,
        userId: bug.reportedBy,
      }),
    );

    return bug;
  }

  /**
   * Triage the bug: assign severity, priority, and assignee.
   *
   * Called during bug triage process to evaluate impact and assign work.
   *
   * @throws Error if bug is in terminal state
   * @throws Error if bug already triaged
   */
  public triage(params: {
    severity: BugSeverityLevel;
    priority: BugPriorityLevel;
    assignedTo?: string;
    tags?: string[];
  }): void {
    if (BugStatusHelper.isTerminal(this.status)) {
      throw new Error(
        `Cannot triage ${this.status} bug. ` +
          `Only OPEN and TRIAGED bugs can be triaged.`,
      );
    }

    if (this.status === BugStatusType.TRIAGED && this.severity) {
      throw new Error('Bug is already triaged. Use updateTriage() to modify.');
    }

    this.severity = params.severity;
    this.priority = params.priority;
    this.assignedTo = params.assignedTo;
    if (params.tags) {
      this.tags = params.tags;
    }

    // Transition to TRIAGED
    if (this.status === BugStatusType.OPEN) {
      this.status = BugStatusType.TRIAGED;
    }

    this.triageDate = new Date();
    this.updatedAt = new Date();

    // Publish triage event
    this.addDomainEvent(
      new BugTriaged(this.id, this.tenantId, {
        severity: this.severity,
        priority: this.priority,
        assignedTo: this.assignedTo,
        userId: params.assignedTo,
      }),
    );
  }

  /**
   * Mark bug as in progress (developer started working on it).
   *
   * @throws Error if invalid state transition
   */
  public markInProgress(userId?: string): void {
    if (
      !BugStatusHelper.isValidTransition(this.status, BugStatusType.IN_PROGRESS)
    ) {
      throw new Error(
        `Cannot mark ${this.status} bug as in progress. ` +
          `Valid next states: ${BugStatusHelper.getValidNextStates(this.status).join(', ')}`,
      );
    }

    this.status = BugStatusType.IN_PROGRESS;
    this.updatedAt = new Date();
  }

  /**
   * Mark bug as resolved (fix implemented).
   *
   * @throws Error if invalid state transition
   */
  public markResolved(resolutionNotes: string, userId?: string): void {
    if (
      !BugStatusHelper.isValidTransition(this.status, BugStatusType.RESOLVED)
    ) {
      throw new Error(
        `Cannot mark ${this.status} bug as resolved. ` +
          `Valid next states: ${BugStatusHelper.getValidNextStates(this.status).join(', ')}`,
      );
    }

    this.status = BugStatusType.RESOLVED;
    this.resolvedDate = new Date();
    this.updatedAt = new Date();

    // Publish resolution event
    this.addDomainEvent(
      new BugResolved(this.id, this.tenantId, {
        severity: this.severity,
        priority: this.priority,
        resolutionNotes,
        userId,
      }),
    );
  }

  /**
   * Mark bug as verified (QA confirmed fix works).
   *
   * @throws Error if invalid state transition
   */
  public markVerified(userId?: string): void {
    if (
      !BugStatusHelper.isValidTransition(this.status, BugStatusType.VERIFIED)
    ) {
      throw new Error(
        `Cannot mark ${this.status} bug as verified. ` +
          `Valid next states: ${BugStatusHelper.getValidNextStates(this.status).join(', ')}`,
      );
    }

    this.status = BugStatusType.VERIFIED;
    this.updatedAt = new Date();
  }

  /**
   * Mark bug as closed (released to production).
   *
   * @throws Error if invalid state transition
   */
  public markClosed(userId?: string): void {
    if (!BugStatusHelper.isValidTransition(this.status, BugStatusType.CLOSED)) {
      throw new Error(
        `Cannot close ${this.status} bug. ` +
          `Valid next states: ${BugStatusHelper.getValidNextStates(this.status).join(', ')}`,
      );
    }

    this.status = BugStatusType.CLOSED;
    this.closedDate = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Reopen bug (QA found issues in resolved fix).
   *
   * @throws Error if invalid state transition
   */
  public reopen(reopenReason: string, userId?: string): void {
    if (!BugStatusHelper.isValidTransition(this.status, BugStatusType.OPEN)) {
      throw new Error(
        `Cannot reopen ${this.status} bug. ` +
          `Valid next states: ${BugStatusHelper.getValidNextStates(this.status).join(', ')}`,
      );
    }

    this.status = BugStatusType.OPEN;
    this.updatedAt = new Date();

    // Publish reopened event
    this.addDomainEvent(
      new BugReopened(this.id, this.tenantId, {
        reason: reopenReason,
        userId,
      }),
    );
  }

  /**
   * Defer bug (postpone for future release).
   *
   * @throws Error if invalid state transition
   */
  public defer(reason: string, userId?: string): void {
    if (
      !BugStatusHelper.isValidTransition(this.status, BugStatusType.DEFERRED)
    ) {
      throw new Error(
        `Cannot defer ${this.status} bug. ` +
          `Valid next states: ${BugStatusHelper.getValidNextStates(this.status).join(', ')}`,
      );
    }

    this.status = BugStatusType.DEFERRED;
    this.updatedAt = new Date();
  }

  /**
   * Mark bug as invalid (not a bug, working as designed).
   *
   * @throws Error if invalid state transition
   */
  public markInvalid(reason: string, userId?: string): void {
    if (
      !BugStatusHelper.isValidTransition(this.status, BugStatusType.INVALID)
    ) {
      throw new Error(
        `Cannot mark ${this.status} bug as invalid. ` +
          `Valid next states: ${BugStatusHelper.getValidNextStates(this.status).join(', ')}`,
      );
    }

    this.status = BugStatusType.INVALID;
    this.updatedAt = new Date();
  }

  /**
   * Update triage information (severity, priority, assignment).
   *
   * @throws Error if bug not triaged yet or in terminal state
   */
  public updateTriage(params: {
    severity?: BugSeverityLevel;
    priority?: BugPriorityLevel;
    assignedTo?: string;
  }): void {
    if (BugStatusHelper.isTerminal(this.status)) {
      throw new Error(`Cannot update triage on ${this.status} bug.`);
    }

    if (params.severity) this.severity = params.severity;
    if (params.priority) this.priority = params.priority;
    if (params.assignedTo !== undefined) this.assignedTo = params.assignedTo;

    this.updatedAt = new Date();
  }

  /**
   * Check if bug blocks release
   */
  public blocksRelease(): boolean {
    if (!this.severity) {
      return false;
    }

    // Critical bugs always block
    if (BugSeverityHelper.blocksRelease(this.severity)) {
      return !BugStatusHelper.isResolved(this.status);
    }

    // P0 bugs block if not closed
    if (this.priority && BugPriorityHelper.blocksRelease(this.priority)) {
      return !BugStatusHelper.isResolved(this.status);
    }

    return false;
  }

  /**
   * Check if bug is resolved/closed
   */
  public isFixed(): boolean {
    return BugStatusHelper.isResolved(this.status);
  }

  /**
   * Check if bug is in active state (can still be worked on)
   */
  public isActive(): boolean {
    return BugStatusHelper.isInProgress(this.status);
  }

  /**
   * Get bug impact score for dashboard/metrics (0-100)
   */
  public getImpactScore(): number {
    let score = 0;

    // Severity contribution (0-50)
    if (this.severity) {
      score += (BugSeverityHelper.getWeight(this.severity) / 100) * 50;
    }

    // Priority contribution (0-30)
    if (this.priority) {
      score += (BugPriorityHelper.getWeight(this.priority) / 100) * 30;
    }

    // Status contribution (0-20)
    if (!this.isFixed()) {
      // Active bugs have higher impact
      score += 20;
    }

    return Math.round(score);
  }

  /**
   * Get detailed bug information for display
   */
  public getDetails(): BugDetails {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      status: this.status,
      severity: this.severity,
      priority: this.priority,
      reportedBy: this.reportedBy,
      assignedTo: this.assignedTo,
      tags: this.tags,
      blocksRelease: this.blocksRelease(),
      impactScore: this.getImpactScore(),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      triageDate: this.triageDate,
      resolvedDate: this.resolvedDate,
      closedDate: this.closedDate,
    };
  }

  /**
   * Get human-readable summary
   */
  public getSummary(): string {
    return (
      `[${this.severity || '?'}] ${this.title} ` +
      `(${this.status}) - ${this.priority || '?'}`
    );
  }
}

/**
 * Bug details for external consumption
 */
export interface BugDetails {
  id: string;
  title: string;
  description: string;
  status: BugStatusType;
  severity?: BugSeverityLevel;
  priority?: BugPriorityLevel;
  reportedBy: string;
  assignedTo?: string;
  tags: string[];
  blocksRelease: boolean;
  impactScore: number;
  createdAt: Date;
  updatedAt: Date;
  triageDate?: Date;
  resolvedDate?: Date;
  closedDate?: Date;
}
