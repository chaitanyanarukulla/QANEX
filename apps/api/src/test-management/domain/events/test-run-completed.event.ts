import { DomainEvent } from '../../../common/domain/aggregate-root.interface';

/**
 * TestRunCompleted Domain Event
 *
 * Published when all tests finish and results are analyzed.
 *
 * Critical event indicating test execution complete and metrics final.
 *
 * Subscribers should:
 * - Generate test report/metrics
 * - Update release readiness if pass rate critical
 * - Notify stakeholders of results
 * - Archive test results
 * - Update project health dashboard
 * - Calculate velocity/trend metrics
 */
export class TestRunCompleted implements DomainEvent {
  readonly eventId: string;
  readonly eventType = 'TestRunCompleted';
  readonly aggregateType = 'TestRun';
  readonly aggregateId: string;
  readonly tenantId: string;
  readonly userId?: string;
  readonly occurredAt: Date;

  // Results data
  readonly testRunId: string;
  readonly passedTests: number;
  readonly failedTests: number;
  readonly passRate: number;
  readonly durationMs: number;

  constructor(
    aggregateId: string,
    tenantId: string,
    data: {
      passedTests: number;
      failedTests: number;
      passRate: number;
      durationMs: number;
      userId?: string;
      occurredAt?: Date;
      eventId?: string;
    },
  ) {
    this.aggregateId = aggregateId;
    this.tenantId = tenantId;
    this.testRunId = aggregateId;
    this.passedTests = data.passedTests;
    this.failedTests = data.failedTests;
    this.passRate = data.passRate;
    this.durationMs = data.durationMs;
    this.userId = data.userId;
    this.occurredAt = data.occurredAt ?? new Date();
    this.eventId =
      data.eventId ?? `TestRunCompleted-${aggregateId}-${Date.now()}`;
  }

  /**
   * Get human-readable summary
   */
  getSummary(): string {
    return (
      `Test run completed: ${this.passedTests} passed, ${this.failedTests} failed ` +
      `(${this.passRate}% pass rate)`
    );
  }
}
