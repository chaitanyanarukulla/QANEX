/**
 * BugStatus Value Object
 *
 * Represents the lifecycle state of a bug.
 *
 * Status Transitions:
 * - OPEN → TRIAGED (during triage process)
 * - TRIAGED → IN_PROGRESS (when developer starts work)
 * - IN_PROGRESS → RESOLVED (when fix is implemented)
 * - RESOLVED → VERIFIED (when QA confirms fix)
 * - VERIFIED → CLOSED (when released to production)
 * - OPEN/TRIAGED/IN_PROGRESS → DEFERRED (if postponed)
 * - Any non-terminal → INVALID (if found to be non-issue)
 *
 * Terminal states: CLOSED, INVALID, DEFERRED
 */

export enum BugStatusType {
  OPEN = 'OPEN',
  TRIAGED = 'TRIAGED',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  VERIFIED = 'VERIFIED',
  CLOSED = 'CLOSED',
  DEFERRED = 'DEFERRED',
  INVALID = 'INVALID',
}

/**
 * Helper class for BugStatus operations
 */
export class BugStatusHelper {
  /**
   * Get all valid next states for current state
   */
  static getValidNextStates(currentStatus: BugStatusType): BugStatusType[] {
    const validTransitions: Record<BugStatusType, BugStatusType[]> = {
      [BugStatusType.OPEN]: [
        BugStatusType.TRIAGED,
        BugStatusType.DEFERRED,
        BugStatusType.INVALID,
      ],
      [BugStatusType.TRIAGED]: [
        BugStatusType.IN_PROGRESS,
        BugStatusType.DEFERRED,
        BugStatusType.INVALID,
      ],
      [BugStatusType.IN_PROGRESS]: [
        BugStatusType.RESOLVED,
        BugStatusType.DEFERRED,
        BugStatusType.INVALID,
      ],
      [BugStatusType.RESOLVED]: [BugStatusType.VERIFIED, BugStatusType.INVALID],
      [BugStatusType.VERIFIED]: [BugStatusType.CLOSED, BugStatusType.OPEN], // Can reopen if QA finds issues
      [BugStatusType.CLOSED]: [],
      [BugStatusType.DEFERRED]: [BugStatusType.TRIAGED, BugStatusType.OPEN], // Can reactivate
      [BugStatusType.INVALID]: [],
    };

    return validTransitions[currentStatus] || [];
  }

  /**
   * Check if transition from current to next status is valid
   */
  static isValidTransition(
    currentStatus: BugStatusType,
    nextStatus: BugStatusType,
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
  static isTerminal(status: BugStatusType): boolean {
    return (
      status === BugStatusType.CLOSED ||
      status === BugStatusType.INVALID ||
      status === BugStatusType.DEFERRED
    );
  }

  /**
   * Check if bug is in active work (being fixed)
   */
  static isInProgress(status: BugStatusType): boolean {
    return (
      status === BugStatusType.OPEN ||
      status === BugStatusType.TRIAGED ||
      status === BugStatusType.IN_PROGRESS ||
      status === BugStatusType.RESOLVED ||
      status === BugStatusType.VERIFIED
    );
  }

  /**
   * Check if bug is done (successfully fixed and closed)
   */
  static isResolved(status: BugStatusType): boolean {
    return status === BugStatusType.CLOSED;
  }

  /**
   * Get human-readable description of status
   */
  static getDescription(status: BugStatusType): string {
    const descriptions: Record<BugStatusType, string> = {
      [BugStatusType.OPEN]: 'Bug reported and waiting for triage',
      [BugStatusType.TRIAGED]: 'Bug prioritized and waiting for assignment',
      [BugStatusType.IN_PROGRESS]: 'Bug is being fixed by developer',
      [BugStatusType.RESOLVED]:
        'Fix implemented and waiting for QA verification',
      [BugStatusType.VERIFIED]: 'QA verified the fix, ready for release',
      [BugStatusType.CLOSED]: 'Bug fixed and released to production',
      [BugStatusType.DEFERRED]: 'Bug postponed for future release',
      [BugStatusType.INVALID]:
        'Bug determined to be non-issue or working as designed',
    };

    return descriptions[status] || 'Unknown status';
  }

  /**
   * Get workflow stage percentage (for progress visualization)
   */
  static getWorkflowPercentage(status: BugStatusType): number {
    const percentages: Record<BugStatusType, number> = {
      [BugStatusType.OPEN]: 0,
      [BugStatusType.TRIAGED]: 20,
      [BugStatusType.IN_PROGRESS]: 40,
      [BugStatusType.RESOLVED]: 60,
      [BugStatusType.VERIFIED]: 80,
      [BugStatusType.CLOSED]: 100,
      [BugStatusType.DEFERRED]: 0, // Back to start
      [BugStatusType.INVALID]: 0,
    };

    return percentages[status] || 0;
  }
}
