import { DomainEvent } from '../../../common/domain/aggregate-root.interface';
import { BugSeverityLevel } from '../value-objects/bug-severity.vo';
import { BugPriorityLevel } from '../value-objects/bug-priority.vo';

/**
 * BugTriaged Domain Event
 *
 * Published when bug severity and priority are assigned during triage.
 *
 * Critical event that determines bug impact and urgency.
 *
 * Subscribers should:
 * - Update bug dashboard with severity/priority
 * - Trigger SLA tracking based on priority
 * - Update release readiness if critical/P0
 * - Notify assigned developer
 * - Add to sprint backlog if assigned
 */
export class BugTriaged implements DomainEvent {
  readonly eventId: string;
  readonly eventType = 'BugTriaged';
  readonly aggregateType = 'Bug';
  readonly aggregateId: string;
  readonly tenantId: string;
  readonly userId?: string;
  readonly occurredAt: Date;

  // Triage data
  readonly bugId: string;
  readonly severity: BugSeverityLevel;
  readonly priority: BugPriorityLevel;
  readonly assignedTo?: string;

  constructor(
    aggregateId: string,
    tenantId: string,
    data: {
      severity: BugSeverityLevel;
      priority: BugPriorityLevel;
      assignedTo?: string;
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
    this.assignedTo = data.assignedTo;
    this.userId = data.userId;
    this.occurredAt = data.occurredAt ?? new Date();
    this.eventId =
      data.eventId ?? `BugTriaged-${aggregateId}-${Date.now()}`;
  }

  /**
   * Get human-readable summary of triage
   */
  getSummary(): string {
    return (
      `Bug triaged: severity=${this.severity}, priority=${this.priority}` +
      (this.assignedTo ? `, assigned to ${this.assignedTo}` : '')
    );
  }
}
