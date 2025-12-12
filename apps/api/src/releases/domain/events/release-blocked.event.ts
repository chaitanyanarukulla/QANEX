import { DomainEvent } from '../../../common/domain/aggregate-root.interface';

/**
 * ReleaseBlocked Domain Event
 *
 * Published when a release is blocked due to critical issues discovered
 * after initial evaluation or during the release window.
 *
 * Critical event that halts the release process.
 *
 * Subscribers should:
 * - Notify all stakeholders immediately
 * - Block deployment pipeline
 * - Create incident/bug priority escalation
 * - Request immediate triage and fix
 * - Schedule re-evaluation timeline
 */
export class ReleaseBlocked implements DomainEvent {
  readonly eventId: string;
  readonly eventType = 'ReleaseBlocked';
  readonly aggregateType = 'Release';
  readonly aggregateId: string;
  readonly tenantId: string;
  readonly userId?: string;
  readonly occurredAt: Date;

  // Blocking information
  readonly releaseId: string;
  readonly version: string;
  readonly reason: string;

  constructor(
    aggregateId: string,
    tenantId: string,
    data: {
      version: string;
      reason: string;
      eventId?: string;
      userId?: string;
      occurredAt?: Date;
    },
  ) {
    this.aggregateId = aggregateId;
    this.tenantId = tenantId;
    this.releaseId = aggregateId;
    this.version = data.version;
    this.reason = data.reason;
    this.userId = data.userId;
    this.occurredAt = data.occurredAt ?? new Date();
    this.eventId =
      data.eventId ?? `ReleaseBlocked-${aggregateId}-${Date.now()}`;
  }

  /**
   * Get human-readable summary of blocking
   */
  getSummary(): string {
    return `Release ${this.version} blocked: ${this.reason}`;
  }
}
