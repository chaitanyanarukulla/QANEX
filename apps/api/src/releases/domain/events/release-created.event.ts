import { DomainEvent } from '../../../common/domain/aggregate-root.interface';

/**
 * ReleaseCreated Domain Event
 *
 * Published when a new release is created and initialized.
 *
 * Subscribers should:
 * - Create release record in analytics/reporting
 * - Initialize release metrics tracking
 * - Notify stakeholders of new release
 * - Set up monitoring for the release
 */
export class ReleaseCreated implements DomainEvent {
  readonly eventId: string;
  readonly eventType = 'ReleaseCreated';
  readonly aggregateType = 'Release';
  readonly aggregateId: string;
  readonly tenantId: string;
  readonly userId?: string;
  readonly occurredAt: Date;

  // Release-specific data
  readonly releaseId: string;
  readonly version: string;
  readonly environment: string;

  constructor(
    aggregateId: string,
    tenantId: string,
    version: string,
    options?: {
      eventId?: string;
      userId?: string;
      environment?: string;
      occurredAt?: Date;
    },
  ) {
    this.aggregateId = aggregateId;
    this.tenantId = tenantId;
    this.releaseId = aggregateId;
    this.version = version;
    this.environment = options?.environment || 'production';
    this.userId = options?.userId;
    this.occurredAt = options?.occurredAt ?? new Date();
    this.eventId =
      options?.eventId ?? `ReleaseCreated-${aggregateId}-${Date.now()}`;
  }

  /**
   * Get human-readable summary of creation
   */
  getSummary(): string {
    return `Release ${this.version} created for ${this.environment} environment`;
  }
}
