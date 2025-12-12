/**
 * ReleaseStatus Value Object
 *
 * Represents the state of a release in its lifecycle.
 *
 * State Transitions:
 * - PLANNED → ACTIVE → FROZEN → RELEASED (success path)
 * - PLANNED/ACTIVE/FROZEN → BLOCKED (if critical issues emerge)
 * - BLOCKED → ACTIVE (after re-evaluation fixes issues)
 * - PLANNED/ACTIVE/FROZEN/BLOCKED → ABORTED (emergency abort)
 * - RELEASED and ABORTED are terminal states (no further transitions)
 *
 * Invariants:
 * - Cannot transition to same state
 * - Cannot transition from terminal states
 * - Invalid transitions throw error
 */

export enum ReleaseStatus {
  PLANNED = 'PLANNED',
  ACTIVE = 'ACTIVE',
  FROZEN = 'FROZEN',
  RELEASED = 'RELEASED',
  BLOCKED = 'BLOCKED',
  ABORTED = 'ABORTED',
}

/**
 * Helper class for ReleaseStatus transitions and validation
 */
export class ReleaseStatusHelper {
  /**
   * Get all valid next states for current state
   */
  static getValidNextStates(currentStatus: ReleaseStatus): ReleaseStatus[] {
    const validTransitions: Record<ReleaseStatus, ReleaseStatus[]> = {
      [ReleaseStatus.PLANNED]: [
        ReleaseStatus.ACTIVE,
        ReleaseStatus.BLOCKED,
        ReleaseStatus.ABORTED,
      ],
      [ReleaseStatus.ACTIVE]: [
        ReleaseStatus.FROZEN,
        ReleaseStatus.BLOCKED,
        ReleaseStatus.ABORTED,
      ],
      [ReleaseStatus.FROZEN]: [
        ReleaseStatus.RELEASED,
        ReleaseStatus.BLOCKED,
        ReleaseStatus.ABORTED,
      ],
      [ReleaseStatus.RELEASED]: [],
      [ReleaseStatus.BLOCKED]: [ReleaseStatus.ACTIVE, ReleaseStatus.ABORTED],
      [ReleaseStatus.ABORTED]: [],
    };

    return validTransitions[currentStatus] || [];
  }

  /**
   * Check if transition from current to next status is valid
   */
  static isValidTransition(
    currentStatus: ReleaseStatus,
    nextStatus: ReleaseStatus,
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
  static isTerminal(status: ReleaseStatus): boolean {
    return (
      status === ReleaseStatus.RELEASED || status === ReleaseStatus.ABORTED
    );
  }

  /**
   * Check if status is blocking (gates failed)
   */
  static isBlocking(status: ReleaseStatus): boolean {
    return status === ReleaseStatus.BLOCKED;
  }

  /**
   * Check if release is in progress (can still be modified)
   */
  static isInProgress(status: ReleaseStatus): boolean {
    return (
      status === ReleaseStatus.PLANNED ||
      status === ReleaseStatus.ACTIVE ||
      status === ReleaseStatus.FROZEN ||
      status === ReleaseStatus.BLOCKED
    );
  }

  /**
   * Get human-readable description of status
   */
  static getDescription(status: ReleaseStatus): string {
    const descriptions: Record<ReleaseStatus, string> = {
      [ReleaseStatus.PLANNED]: 'Release is planned and awaiting evaluation',
      [ReleaseStatus.ACTIVE]: 'Release is active and can be modified',
      [ReleaseStatus.FROZEN]: 'Release is frozen and ready for final approval',
      [ReleaseStatus.RELEASED]: 'Release has been deployed to production',
      [ReleaseStatus.BLOCKED]: 'Release is blocked due to critical issues',
      [ReleaseStatus.ABORTED]: 'Release has been aborted',
    };

    return descriptions[status] || 'Unknown status';
  }
}
