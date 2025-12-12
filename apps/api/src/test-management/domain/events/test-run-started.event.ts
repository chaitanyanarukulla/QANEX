import { DomainEvent } from '../../../common/domain/aggregate-root.interface';

/**
 * TestRunStarted Domain Event
 *
 * Published when test execution begins.
 *
 * Subscribers should:
 * - Start burndown chart tracking
 * - Initialize progress monitoring
 * - Send team notifications
 * - Begin result aggregation
 */
export class TestRunStarted implements DomainEvent {
  readonly eventId: string;
  readonly eventType = 'TestRunStarted';
  readonly aggregateType = 'TestRun';
  readonly aggregateId: string;
  readonly tenantId: string;
  readonly userId?: string;
  readonly occurredAt: Date;

  // Test run data
  readonly testRunId: string;
  readonly expectedTestCount: number;

  constructor(
    aggregateId: string,
    tenantId: string,
    data: {
      expectedTestCount: number;
      userId?: string;
      occurredAt?: Date;
      eventId?: string;
    },
  ) {
    this.aggregateId = aggregateId;
    this.tenantId = tenantId;
    this.testRunId = aggregateId;
    this.expectedTestCount = data.expectedTestCount;
    this.userId = data.userId;
    this.occurredAt = data.occurredAt ?? new Date();
    this.eventId =
      data.eventId ?? `TestRunStarted-${aggregateId}-${Date.now()}`;
  }

  /**
   * Get human-readable summary
   */
  getSummary(): string {
    return `Test execution started, expecting ${this.expectedTestCount} tests`;
  }
}
