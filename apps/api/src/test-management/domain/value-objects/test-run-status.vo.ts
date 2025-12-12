/**
 * TestRunStatus Value Object
 *
 * Represents the lifecycle state of a test run.
 *
 * Status Transitions:
 * - CREATED → RUNNING (when execution starts)
 * - RUNNING → COMPLETED (when all tests finish)
 * - CREATED/RUNNING → STOPPED (manual stop)
 * - RUNNING/COMPLETED → ANALYZED (analysis done)
 * - Any non-terminal → CANCELLED (cleanup)
 *
 * Terminal states: COMPLETED, CANCELLED
 */

export enum TestRunStatusType {
  CREATED = 'CREATED',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  STOPPED = 'STOPPED',
  ANALYZED = 'ANALYZED',
  CANCELLED = 'CANCELLED',
}

/**
 * Helper class for TestRunStatus operations
 */
export class TestRunStatusHelper {
  /**
   * Get all valid next states for current state
   */
  static getValidNextStates(
    currentStatus: TestRunStatusType,
  ): TestRunStatusType[] {
    const validTransitions: Record<TestRunStatusType, TestRunStatusType[]> = {
      [TestRunStatusType.CREATED]: [
        TestRunStatusType.RUNNING,
        TestRunStatusType.CANCELLED,
      ],
      [TestRunStatusType.RUNNING]: [
        TestRunStatusType.COMPLETED,
        TestRunStatusType.STOPPED,
        TestRunStatusType.CANCELLED,
      ],
      [TestRunStatusType.COMPLETED]: [
        TestRunStatusType.ANALYZED,
        TestRunStatusType.CANCELLED,
      ],
      [TestRunStatusType.STOPPED]: [
        TestRunStatusType.ANALYZED,
        TestRunStatusType.CANCELLED,
      ],
      [TestRunStatusType.ANALYZED]: [TestRunStatusType.CANCELLED],
      [TestRunStatusType.CANCELLED]: [],
    };

    return validTransitions[currentStatus] || [];
  }

  /**
   * Check if transition from current to next status is valid
   */
  static isValidTransition(
    currentStatus: TestRunStatusType,
    nextStatus: TestRunStatusType,
  ): boolean {
    if (currentStatus === nextStatus) {
      return false; // Cannot transition to same state
    }

    const validNextStates = this.getValidNextStates(currentStatus);
    return validNextStates.includes(nextStatus);
  }

  /**
   * Check if status is terminal (no further transitions)
   */
  static isTerminal(status: TestRunStatusType): boolean {
    return (
      status === TestRunStatusType.COMPLETED ||
      status === TestRunStatusType.CANCELLED
    );
  }

  /**
   * Check if test run is actively executing
   */
  static isExecuting(status: TestRunStatusType): boolean {
    return (
      status === TestRunStatusType.CREATED ||
      status === TestRunStatusType.RUNNING
    );
  }

  /**
   * Check if results are available
   */
  static hasResults(status: TestRunStatusType): boolean {
    return (
      status === TestRunStatusType.COMPLETED ||
      status === TestRunStatusType.STOPPED ||
      status === TestRunStatusType.ANALYZED
    );
  }

  /**
   * Get human-readable description of status
   */
  static getDescription(status: TestRunStatusType): string {
    const descriptions: Record<TestRunStatusType, string> = {
      [TestRunStatusType.CREATED]: 'Test run created, awaiting execution',
      [TestRunStatusType.RUNNING]: 'Tests are currently executing',
      [TestRunStatusType.COMPLETED]: 'All tests completed successfully',
      [TestRunStatusType.STOPPED]: 'Test execution was stopped',
      [TestRunStatusType.ANALYZED]: 'Results have been analyzed',
      [TestRunStatusType.CANCELLED]: 'Test run was cancelled',
    };

    return descriptions[status] || 'Unknown status';
  }

  /**
   * Get progress percentage based on status
   */
  static getProgressPercentage(status: TestRunStatusType): number {
    const percentages: Record<TestRunStatusType, number> = {
      [TestRunStatusType.CREATED]: 0,
      [TestRunStatusType.RUNNING]: 50,
      [TestRunStatusType.COMPLETED]: 100,
      [TestRunStatusType.STOPPED]: 75,
      [TestRunStatusType.ANALYZED]: 100,
      [TestRunStatusType.CANCELLED]: 0,
    };

    return percentages[status] || 0;
  }
}
