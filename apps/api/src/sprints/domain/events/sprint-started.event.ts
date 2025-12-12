import { DomainEvent } from '../../../common/domain/aggregate-root.interface';

/**
 * SprintStarted Domain Event
 *
 * Published when a sprint transitions from PLANNED to ACTIVE.
 *
 * Critical event that signals the sprint has officially begun.
 *
 * Subscribers should:
 * - Notify team members
 * - Calculate velocity baseline
 * - Start burndown tracking
 * - Update project roadmap
 * - Create sprint dashboards
 */
export class SprintStarted implements DomainEvent {
  readonly eventId: string;
  readonly eventType = 'SprintStarted';
  readonly aggregateType = 'Sprint';
  readonly aggregateId: string;
  readonly tenantId: string;
  readonly userId?: string;
  readonly occurredAt: Date;

  // Sprint-specific event data
  readonly sprintId: string;
  readonly itemCount: number;
  readonly totalStoryPoints: number;

  constructor(
    aggregateId: string,
    tenantId: string,
    options?: {
      eventId?: string;
      userId?: string;
      itemCount?: number;
      totalStoryPoints?: number;
      occurredAt?: Date;
    },
  ) {
    this.aggregateId = aggregateId;
    this.tenantId = tenantId;
    this.sprintId = aggregateId;
    this.itemCount = options?.itemCount ?? 0;
    this.totalStoryPoints = options?.totalStoryPoints ?? 0;
    this.userId = options?.userId;
    this.occurredAt = options?.occurredAt ?? new Date();
    this.eventId =
      options?.eventId ?? `SprintStarted-${aggregateId}-${Date.now()}`;
  }
}
