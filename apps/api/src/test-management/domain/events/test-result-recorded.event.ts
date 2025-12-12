import { DomainEvent } from '../../../common/domain/aggregate-root.interface';

/**
 * TestResultRecorded Domain Event
 *
 * Published when individual test result is recorded.
 *
 * Subscribers should:
 * - Update real-time progress dashboard
 * - Update burndown chart
 * - Track flaky tests
 * - Aggregate metrics
 */
export class TestResultRecorded implements DomainEvent {
  readonly eventId: string;
  readonly eventType = 'TestResultRecorded';
  readonly aggregateType = 'TestRun';
  readonly aggregateId: string;
  readonly tenantId: string;
  readonly userId?: string;
  readonly occurredAt: Date;

  // Result data
  readonly testRunId: string;
  readonly testCaseId: string;
  readonly passed: boolean;
  readonly durationMs?: number;

  constructor(
    aggregateId: string,
    tenantId: string,
    data: {
      testCaseId: string;
      passed: boolean;
      durationMs?: number;
      userId?: string;
      occurredAt?: Date;
      eventId?: string;
    },
  ) {
    this.aggregateId = aggregateId;
    this.tenantId = tenantId;
    this.testRunId = aggregateId;
    this.testCaseId = data.testCaseId;
    this.passed = data.passed;
    this.durationMs = data.durationMs;
    this.userId = data.userId;
    this.occurredAt = data.occurredAt ?? new Date();
    this.eventId =
      data.eventId ??
      `TestResultRecorded-${aggregateId}-${data.testCaseId}-${Date.now()}`;
  }

  /**
   * Get human-readable summary
   */
  getSummary(): string {
    const status = this.passed ? '✓ PASS' : '✗ FAIL';
    const duration =
      this.durationMs !== undefined ? ` (${this.durationMs}ms)` : '';
    return `Test result: ${status}${duration}`;
  }
}
