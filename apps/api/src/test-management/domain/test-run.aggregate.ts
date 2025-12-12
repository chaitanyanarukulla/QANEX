import { BaseDomainAggregate } from '../../common/domain/aggregate-root.interface';
import { PassRateHelper, PassRateStatus } from './value-objects/pass-rate.vo';
import {
  TestRunStatusType,
  TestRunStatusHelper,
} from './value-objects/test-run-status.vo';
import { TestRunCreated } from './events/test-run-created.event';
import { TestRunStarted } from './events/test-run-started.event';
import { TestResultRecorded } from './events/test-result-recorded.event';
import { TestRunCompleted } from './events/test-run-completed.event';

/**
 * TestRun Aggregate Root
 *
 * Represents a single execution of test suite and manages result recording.
 * Tracks individual test cases and aggregates pass/fail metrics.
 *
 * Invariants (Domain Rules):
 * 1. TestRun ID must be unique per tenant
 * 2. Status transitions must be valid (enforced by TestRunStatusHelper)
 * 3. Cannot modify completed/cancelled test runs
 * 4. Test results recorded must match expected test count
 * 5. Pass rate is calculated from individual test results
 * 6. Release gate requires >= 80% pass rate
 *
 * Domain Events Published:
 * - TestRunCreated: Test run initialized
 * - TestRunStarted: Execution begins
 * - TestResultRecorded: Individual test completes
 * - TestRunCompleted: All tests finished and analyzed
 *
 * Cross-Context Integration:
 * - Release context: Pass rate affects ReleaseConfidenceScore
 * - Sprint context: Test metrics update sprint status
 * - Requirement context: Test coverage validates requirements
 *
 * Example:
 * ```typescript
 * const testRun = TestRun.create({
 *   id: 'run-1',
 *   tenantId: 'tenant-1',
 *   sprintId: 'sprint-1',
 *   testSuiteId: 'suite-1',
 *   expectedTestCount: 100,
 *   createdBy: 'user-1',
 * });
 *
 * // Start execution
 * testRun.start();
 *
 * // Record individual results
 * testRun.recordResult({
 *   testCaseId: 'tc-1',
 *   name: 'Login test',
 *   passed: true,
 *   durationMs: 500,
 * });
 *
 * // Finish and analyze
 * testRun.complete();
 *
 * // Check readiness
 * if (testRun.meetsReleaseGate()) {
 *   // Safe to release
 * }
 *
 * // Save and publish
 * await repo.save(testRun);
 * await eventPublisher.publishAll(testRun.getDomainEvents());
 * ```
 */
export class TestRun extends BaseDomainAggregate {
  public id: string;
  public tenantId: string;
  public sprintId?: string;
  public testSuiteId?: string;
  public status: TestRunStatusType;
  public expectedTestCount: number;
  public passedTests: number = 0;
  public failedTests: number = 0;
  public skippedTests: number = 0;
  public totalDurationMs: number = 0;
  public passRate: number = 0;
  public passRateStatus: PassRateStatus = PassRateStatus.EXCELLENT;
  public createdBy: string;
  public createdAt: Date;
  public startedAt?: Date;
  public completedAt?: Date;
  public testResults: TestResult[] = [];

  constructor(
    id: string,
    tenantId: string,
    expectedTestCount: number,
    createdBy: string,
    sprintId?: string,
    testSuiteId?: string,
  ) {
    super();
    this.id = id;
    this.tenantId = tenantId;
    this.expectedTestCount = expectedTestCount;
    this.createdBy = createdBy;
    this.sprintId = sprintId;
    this.testSuiteId = testSuiteId;
    this.status = TestRunStatusType.CREATED;
    this.createdAt = new Date();
  }

  /**
   * Factory method to create a new test run.
   * Publishes TestRunCreated event.
   */
  public static create(params: {
    id: string;
    tenantId: string;
    expectedTestCount: number;
    createdBy: string;
    sprintId?: string;
    testSuiteId?: string;
  }): TestRun {
    if (params.expectedTestCount <= 0) {
      throw new Error('Expected test count must be greater than 0');
    }

    const testRun = new TestRun(
      params.id,
      params.tenantId,
      params.expectedTestCount,
      params.createdBy,
      params.sprintId,
      params.testSuiteId,
    );

    // Publish domain event
    testRun.addDomainEvent(
      new TestRunCreated(testRun.id, testRun.tenantId, {
        expectedTestCount: testRun.expectedTestCount,
        sprintId: testRun.sprintId,
        testSuiteId: testRun.testSuiteId,
        userId: testRun.createdBy,
      }),
    );

    return testRun;
  }

  /**
   * Start test run execution.
   *
   * @throws Error if invalid state transition
   */
  public start(userId?: string): void {
    if (
      !TestRunStatusHelper.isValidTransition(
        this.status,
        TestRunStatusType.RUNNING,
      )
    ) {
      throw new Error(
        `Cannot start ${this.status} test run. ` +
          `Valid next states: ${TestRunStatusHelper.getValidNextStates(this.status).join(', ')}`,
      );
    }

    this.status = TestRunStatusType.RUNNING;
    this.startedAt = new Date();

    // Publish event
    this.addDomainEvent(
      new TestRunStarted(this.id, this.tenantId, {
        expectedTestCount: this.expectedTestCount,
        userId,
      }),
    );
  }

  /**
   * Record individual test result.
   *
   * @throws Error if test run is completed
   */
  public recordResult(result: {
    testCaseId: string;
    name: string;
    passed: boolean;
    durationMs?: number;
    errorMessage?: string;
  }): void {
    if (TestRunStatusHelper.isTerminal(this.status)) {
      throw new Error(`Cannot record result on ${this.status} test run.`);
    }

    // Update counts
    if (result.passed) {
      this.passedTests++;
    } else {
      this.failedTests++;
    }

    if (result.durationMs) {
      this.totalDurationMs += result.durationMs;
    }

    // Store result
    this.testResults.push({
      testCaseId: result.testCaseId,
      name: result.name,
      passed: result.passed,
      durationMs: result.durationMs || 0,
      errorMessage: result.errorMessage,
    });

    // Recalculate pass rate
    this.calculatePassRate();

    // Publish event for each result
    this.addDomainEvent(
      new TestResultRecorded(this.id, this.tenantId, {
        testCaseId: result.testCaseId,
        passed: result.passed,
        durationMs: result.durationMs,
      }),
    );
  }

  /**
   * Complete test run execution.
   *
   * @throws Error if invalid state transition
   */
  public complete(userId?: string): void {
    if (
      !TestRunStatusHelper.isValidTransition(
        this.status,
        TestRunStatusType.COMPLETED,
      )
    ) {
      throw new Error(
        `Cannot complete ${this.status} test run. ` +
          `Valid next states: ${TestRunStatusHelper.getValidNextStates(this.status).join(', ')}`,
      );
    }

    this.status = TestRunStatusType.COMPLETED;
    this.completedAt = new Date();

    // Publish completion event
    this.addDomainEvent(
      new TestRunCompleted(this.id, this.tenantId, {
        passedTests: this.passedTests,
        failedTests: this.failedTests,
        passRate: this.passRate,
        durationMs: this.totalDurationMs,
        userId,
      }),
    );
  }

  /**
   * Stop test run (manual stop, not all tests completed).
   *
   * @throws Error if invalid state transition
   */
  public stop(reason?: string, userId?: string): void {
    if (
      !TestRunStatusHelper.isValidTransition(
        this.status,
        TestRunStatusType.STOPPED,
      )
    ) {
      throw new Error(`Cannot stop ${this.status} test run.`);
    }

    this.status = TestRunStatusType.STOPPED;
    this.completedAt = new Date();
  }

  /**
   * Cancel test run.
   *
   * @throws Error if invalid state transition
   */
  public cancel(reason: string, userId?: string): void {
    if (
      !TestRunStatusHelper.isValidTransition(
        this.status,
        TestRunStatusType.CANCELLED,
      )
    ) {
      throw new Error(`Cannot cancel ${this.status} test run.`);
    }

    this.status = TestRunStatusType.CANCELLED;
    this.completedAt = new Date();
  }

  /**
   * Calculate pass rate from results.
   * Private method called after each result recording.
   */
  private calculatePassRate(): void {
    const totalTests = this.passedTests + this.failedTests + this.skippedTests;
    if (totalTests === 0) {
      this.passRate = 0;
    } else {
      this.passRate = Math.round((this.passedTests / totalTests) * 100);
    }

    this.passRateStatus = PassRateHelper.getStatus(this.passRate);
  }

  /**
   * Check if test run meets release gate requirement (>= 80% pass rate).
   */
  public meetsReleaseGate(): boolean {
    return PassRateHelper.meetsReleaseGate(this.passRate);
  }

  /**
   * Check if all expected tests have been recorded.
   */
  public isComplete(): boolean {
    const recordedTests =
      this.passedTests + this.failedTests + this.skippedTests;
    return recordedTests >= this.expectedTestCount;
  }

  /**
   * Get average test duration in milliseconds.
   */
  public getAverageDuration(): number {
    const totalTests = this.passedTests + this.failedTests;
    if (totalTests === 0) return 0;
    return Math.round(this.totalDurationMs / totalTests);
  }

  /**
   * Get test run summary with key metrics.
   */
  public getSummary(): string {
    return (
      `TestRun: ${this.passedTests}/${this.passedTests + this.failedTests} passed ` +
      `(${this.passRate}%) - ${this.status}`
    );
  }

  /**
   * Get detailed test run information.
   */
  public getDetails(): TestRunDetails {
    return {
      id: this.id,
      status: this.status,
      expectedTestCount: this.expectedTestCount,
      passedTests: this.passedTests,
      failedTests: this.failedTests,
      skippedTests: this.skippedTests,
      passRate: this.passRate,
      passRateStatus: this.passRateStatus,
      totalDurationMs: this.totalDurationMs,
      averageDurationMs: this.getAverageDuration(),
      meetsReleaseGate: this.meetsReleaseGate(),
      createdAt: this.createdAt,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
    };
  }
}

/**
 * Individual test result within a run
 */
export interface TestResult {
  testCaseId: string;
  name: string;
  passed: boolean;
  durationMs: number;
  errorMessage?: string;
}

/**
 * Test run details for external consumption
 */
export interface TestRunDetails {
  id: string;
  status: TestRunStatusType;
  expectedTestCount: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  passRate: number;
  passRateStatus: PassRateStatus;
  totalDurationMs: number;
  averageDurationMs: number;
  meetsReleaseGate: boolean;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}
