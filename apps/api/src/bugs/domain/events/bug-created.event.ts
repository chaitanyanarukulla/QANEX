import { DomainEvent } from '../../../common/domain/aggregate-root.interface';

/**
 * BugCreated Domain Event
 *
 * Published when a new bug is reported and created.
 *
 * Subscribers should:
 * - Create bug record in analytics/dashboard
 * - Initialize bug metrics tracking
 * - Notify team of new bug
 * - Set up monitoring for bug lifecycle
 */
export class BugCreated implements DomainEvent {
  readonly eventId: string;
  readonly eventType = 'BugCreated';
  readonly aggregateType = 'Bug';
  readonly aggregateId: string;
  readonly tenantId: string;
  readonly userId?: string;
  readonly occurredAt: Date;

  // Bug-specific data
  readonly bugId: string;
  readonly title: string;
  readonly description: string;
  readonly reportedBy: string;
  readonly tags: string[];

  constructor(
    aggregateId: string,
    tenantId: string,
    data: {
      title: string;
      description: string;
      reportedBy: string;
      tags?: string[];
      userId?: string;
      occurredAt?: Date;
      eventId?: string;
    },
  ) {
    this.aggregateId = aggregateId;
    this.tenantId = tenantId;
    this.bugId = aggregateId;
    this.title = data.title;
    this.description = data.description;
    this.reportedBy = data.reportedBy;
    this.tags = data.tags || [];
    this.userId = data.userId;
    this.occurredAt = data.occurredAt ?? new Date();
    this.eventId = data.eventId ?? `BugCreated-${aggregateId}-${Date.now()}`;
  }

  /**
   * Get human-readable summary of creation
   */
  getSummary(): string {
    return `Bug reported: ${this.title}`;
  }
}
