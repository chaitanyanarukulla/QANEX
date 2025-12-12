import { DomainEvent } from '../../../common/domain/aggregate-root.interface';

/**
 * ItemAddedToSprint Domain Event
 *
 * Published when an item (task/story/bug) is added to a sprint.
 *
 * Subscribers should:
 * - Update sprint burndown chart
 * - Notify team of new work
 * - Validate capacity constraints
 */
export class ItemAddedToSprint implements DomainEvent {
  readonly eventId: string;
  readonly eventType = 'ItemAddedToSprint';
  readonly aggregateType = 'Sprint';
  readonly aggregateId: string;
  readonly tenantId: string;
  readonly userId?: string;
  readonly occurredAt: Date;

  // Event-specific data
  readonly sprintId: string;
  readonly itemId: string;
  readonly itemTitle: string;
  readonly storyPoints?: number;

  constructor(
    aggregateId: string,
    tenantId: string,
    itemId: string,
    itemTitle: string,
    options?: {
      eventId?: string;
      userId?: string;
      storyPoints?: number;
      occurredAt?: Date;
    },
  ) {
    this.aggregateId = aggregateId;
    this.tenantId = tenantId;
    this.sprintId = aggregateId;
    this.itemId = itemId;
    this.itemTitle = itemTitle;
    this.storyPoints = options?.storyPoints;
    this.userId = options?.userId;
    this.occurredAt = options?.occurredAt ?? new Date();
    this.eventId =
      options?.eventId ??
      `ItemAddedToSprint-${aggregateId}-${itemId}-${Date.now()}`;
  }
}
