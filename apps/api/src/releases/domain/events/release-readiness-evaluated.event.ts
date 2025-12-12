import { DomainEvent } from '../../../common/domain/aggregate-root.interface';
import { ReadinessStatus } from '../value-objects/release-confidence-score.vo';

/**
 * ReleaseReadinessEvaluated Domain Event
 *
 * Published when release readiness is evaluated and RCS is calculated.
 *
 * Critical event that signals readiness assessment is complete.
 *
 * Subscribers should:
 * - Store evaluation results in analytics
 * - Update release dashboard with RCS score
 * - If blocked, notify stakeholders immediately
 * - If ready, update CI/CD pipeline for release approval
 * - Calculate time-to-readiness metrics
 */
export class ReleaseReadinessEvaluated implements DomainEvent {
  readonly eventId: string;
  readonly eventType = 'ReleaseReadinessEvaluated';
  readonly aggregateType = 'Release';
  readonly aggregateId: string;
  readonly tenantId: string;
  readonly userId?: string;
  readonly occurredAt: Date;

  // Readiness data
  readonly releaseId: string;
  readonly version: string;
  readonly score: number;
  readonly status: ReadinessStatus;
  readonly passesAllGates: boolean;

  constructor(
    aggregateId: string,
    tenantId: string,
    data: {
      version: string;
      score: number;
      status: ReadinessStatus;
      passesAllGates: boolean;
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
    this.status = data.status;
    this.passesAllGates = data.passesAllGates;
    this.userId = data.userId;
    this.occurredAt = data.occurredAt ?? new Date();
    this.eventId =
      data.eventId ?? `ReleaseReadinessEvaluated-${aggregateId}-${Date.now()}`;
  }

  /**
   * Get human-readable summary of evaluation
   */
  getSummary(): string {
    const statusStr =
      this.status === 'READY'
        ? '✓ READY'
        : this.status === 'WARNING'
          ? '⚠ WARNING'
          : '✗ BLOCKED';
    return `Release ${this.version}: RCS ${this.score}/100 - ${statusStr}`;
  }
}
