import { DomainEvent } from '../../../common/domain/aggregate-root.interface';
import { BugSeverityLevel } from '../value-objects/bug-severity.vo';
import { BugPriorityLevel } from '../value-objects/bug-priority.vo';

/**
 * BugResolved Domain Event
 *
 * Published when a bug fix is implemented and moved to resolved state.
 *
 * Subscribers should:
 * - Move to QA verification workflow
 * - Update release readiness metrics
 * - Calculate resolution time SLA metrics
 * - Update team dashboard
 * - Trigger deployment pipeline checks
 */
export class BugResolved implements DomainEvent {
  readonly eventId: string;
  readonly eventType = 'BugResolved';
  readonly aggregateType = 'Bug';
  readonly aggregateId: string;
  readonly tenantId: string;
  readonly userId?: string;
  readonly occurredAt: Date;

  // Resolution data
  readonly bugId: string;
  readonly severity?: BugSeverityLevel;
  readonly priority?: BugPriorityLevel;
  readonly resolutionNotes: string;

  constructor(
    aggregateId: string,
    tenantId: string,
    data: {
      severity?: BugSeverityLevel;
      priority?: BugPriorityLevel;
      resolutionNotes: string;
      userId?: string;
      occurredAt?: Date;
      eventId?: string;
    },
  ) {
    this.aggregateId = aggregateId;
    this.tenantId = tenantId;
    this.bugId = aggregateId;
    this.severity = data.severity;
    this.priority = data.priority;
    this.resolutionNotes = data.resolutionNotes;
    this.userId = data.userId;
    this.occurredAt = data.occurredAt ?? new Date();
    this.eventId = data.eventId ?? `BugResolved-${aggregateId}-${Date.now()}`;
  }

  /**
   * Get human-readable summary of resolution
   */
  getSummary(): string {
    return `Bug resolved: ${this.resolutionNotes}`;
  }
}
