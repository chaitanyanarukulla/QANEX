import { DomainEvent } from '../../../common/domain/aggregate-root.interface';

/**
 * SprintCreated Domain Event
 *
 * Published when a new sprint is created.
 *
 * Subscribers should:
 * - Record in audit log
 * - Notify project managers
 * - Prepare sprint resources
 */
export class SprintCreated implements DomainEvent {
  readonly eventId: string;
  readonly eventType = 'SprintCreated';
  readonly aggregateType = 'Sprint';
  readonly aggregateId: string;
  readonly tenantId: string;
  readonly userId?: string;
  readonly occurredAt: Date;

  // Sprint-specific event data
  readonly sprintId: string;
  readonly sprintName: string;
  readonly capacity: number;
  readonly description?: string;

  constructor(
    aggregateId: string,
    tenantId: string,
    sprintName: string,
    capacity: number,
    options?: {
      eventId?: string;
      userId?: string;
      description?: string;
      occurredAt?: Date;
    },
  ) {
    this.aggregateId = aggregateId;
    this.tenantId = tenantId;
    this.sprintId = aggregateId;
    this.sprintName = sprintName;
    this.capacity = capacity;
    this.userId = options?.userId;
    this.description = options?.description;
    this.occurredAt = options?.occurredAt ?? new Date();
    this.eventId =
      options?.eventId ?? `SprintCreated-${aggregateId}-${Date.now()}`;
  }
}
