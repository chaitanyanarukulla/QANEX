import { DomainEvent } from '../../../common/domain/aggregate-root.interface';

/**
 * ReleaseReadinessAchieved Domain Event
 *
 * Published when release passes all readiness gates and is ready for production.
 *
 * This is a significant milestone event that indicates:
 * - RCS score >= 75
 * - No critical bugs
 * - Test coverage >= 80%
 * - All quality gates passed
 *
 * Subscribers should:
 * - Notify release managers immediately
 * - Update CI/CD pipeline to allow release
 * - Create release approval workflow
 * - Generate release readiness report
 * - Schedule deployment window notification
 */
export class ReleaseReadinessAchieved implements DomainEvent {
  readonly eventId: string;
  readonly eventType = 'ReleaseReadinessAchieved';
  readonly aggregateType = 'Release';
  readonly aggregateId: string;
  readonly tenantId: string;
  readonly userId?: string;
  readonly occurredAt: Date;

  // Release data
  readonly releaseId: string;
  readonly version: string;
  readonly score: number;

  constructor(
    aggregateId: string,
    tenantId: string,
    data: {
      version: string;
      score: number;
      eventId?: string;
      userId?: string;
      occurredAt?: Date;
    },
  ) {
    this.aggregateId = aggregateId;
    this.tenantId = tenantId;
    this.releaseId = aggregateId;
    this.version = data.version;
    this.score = data.score;
    this.userId = data.userId;
    this.occurredAt = data.occurredAt ?? new Date();
    this.eventId =
      data.eventId ??
      `ReleaseReadinessAchieved-${aggregateId}-${Date.now()}`;
  }

  /**
   * Get human-readable summary of milestone
   */
  getSummary(): string {
    return `Release ${this.version} is ready for production (RCS: ${this.score}/100)`;
  }
}
