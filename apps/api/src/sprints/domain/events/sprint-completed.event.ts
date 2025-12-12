import { DomainEvent } from '../../../common/domain/aggregate-root.interface';

/**
 * SprintCompleted Domain Event
 *
 * Published when a sprint is completed and metrics are finalized.
 *
 * Critical event that signals sprint has ended and metrics are available.
 *
 * Subscribers should:
 * - Calculate velocity for retrospective analysis
 * - Update project roadmap with completed work
 * - Archive sprint data
 * - Notify stakeholders of completion
 * - Update release readiness metrics
 * - Trigger quality checks on completed work
 */
export class SprintCompleted implements DomainEvent {
  readonly eventId: string;
  readonly eventType = 'SprintCompleted';
  readonly aggregateType = 'Sprint';
  readonly aggregateId: string;
  readonly tenantId: string;
  readonly userId?: string;
  readonly occurredAt: Date;

  // Metrics
  readonly sprintId: string;
  readonly totalItems: number;
  readonly completedItems: number;
  readonly totalStoryPoints: number;
  readonly completedStoryPoints: number;
  readonly completionPercentage: number;
  readonly velocity?: number;

  constructor(
    aggregateId: string,
    tenantId: string,
    metrics: {
      totalItems: number;
      completedItems: number;
      totalStoryPoints: number;
      completedStoryPoints: number;
      completionPercentage: number;
      velocity?: number;
      userId?: string;
      occurredAt?: Date;
      eventId?: string;
    },
  ) {
    this.aggregateId = aggregateId;
    this.tenantId = tenantId;
    this.sprintId = aggregateId;
    this.totalItems = metrics.totalItems;
    this.completedItems = metrics.completedItems;
    this.totalStoryPoints = metrics.totalStoryPoints;
    this.completedStoryPoints = metrics.completedStoryPoints;
    this.completionPercentage = metrics.completionPercentage;
    this.velocity = metrics.velocity;
    this.userId = metrics.userId;
    this.occurredAt = metrics.occurredAt ?? new Date();
    this.eventId =
      metrics.eventId ?? `SprintCompleted-${aggregateId}-${Date.now()}`;
  }

  /**
   * Get human-readable summary of completion.
   */
  getSummary(): string {
    return (
      `Sprint ${this.sprintId}: ` +
      `${this.completedItems}/${this.totalItems} items completed ` +
      `(${this.completionPercentage}%) - ` +
      `${this.completedStoryPoints}/${this.totalStoryPoints} story points`
    );
  }
}
