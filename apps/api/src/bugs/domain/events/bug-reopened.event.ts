import { DomainEvent } from '../../../common/domain/aggregate-root.interface';

/**
 * BugReopened Domain Event
 *
 * Published when QA or users report that a previously resolved bug still exists.
 *
 * Indicates regression or incomplete fix.
 *
 * Subscribers should:
 * - Escalate to developer immediately
 * - Revert release approval if in progress
 * - Update release readiness metrics
 * - Trigger incident escalation
 * - Log regression in metrics
 */
export class BugReopened implements DomainEvent {
  readonly eventId: string;
  readonly eventType = 'BugReopened';
  readonly aggregateType = 'Bug';
  readonly aggregateId: string;
  readonly tenantId: string;
  readonly userId?: string;
  readonly occurredAt: Date;

  // Reopening data
  readonly bugId: string;
  readonly reason: string;

  constructor(
    aggregateId: string,
    tenantId: string,
    data: {
      reason: string;
      userId?: string;
      occurredAt?: Date;
      eventId?: string;
    },
  ) {
    this.aggregateId = aggregateId;
    this.tenantId = tenantId;
    this.bugId = aggregateId;
    this.reason = data.reason;
    this.userId = data.userId;
    this.occurredAt = data.occurredAt ?? new Date();
    this.eventId =
      data.eventId ?? `BugReopened-${aggregateId}-${Date.now()}`;
  }

  /**
   * Get human-readable summary of reopening
   */
  getSummary(): string {
    return `Bug reopened: ${this.reason}`;
  }
}
