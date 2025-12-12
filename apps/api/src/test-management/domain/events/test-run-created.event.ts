import { DomainEvent } from '../../../common/domain/aggregate-root.interface';

/**
 * TestRunCreated Domain Event
 *
 * Published when a new test run is created and initialized.
 *
 * Subscribers should:
 * - Initialize test metrics tracking
 * - Set up test environment/fixtures
 * - Create test run dashboard
 * - Notify team of test execution start
 */
export class TestRunCreated implements DomainEvent {
  readonly eventId: string;
  readonly eventType = 'TestRunCreated';
  readonly aggregateType = 'TestRun';
  readonly aggregateId: string;
  readonly tenantId: string;
  readonly userId?: string;
  readonly occurredAt: Date;

  // Test run data
  readonly testRunId: string;
  readonly expectedTestCount: number;
  readonly sprintId?: string;
  readonly testSuiteId?: string;

  constructor(
    aggregateId: string,
    tenantId: string,
    data: {
      expectedTestCount: number;
      sprintId?: string;
      testSuiteId?: string;
      userId?: string;
      occurredAt?: Date;
      eventId?: string;
    },
  ) {
    this.aggregateId = aggregateId;
    this.tenantId = tenantId;
    this.testRunId = aggregateId;
    this.expectedTestCount = data.expectedTestCount;
    this.sprintId = data.sprintId;
    this.testSuiteId = data.testSuiteId;
    this.userId = data.userId;
    this.occurredAt = data.occurredAt ?? new Date();
    this.eventId =
      data.eventId ?? `TestRunCreated-${aggregateId}-${Date.now()}`;
  }

  /**
   * Get human-readable summary
   */
  getSummary(): string {
    return `Test run created with ${this.expectedTestCount} expected tests`;
  }
}
