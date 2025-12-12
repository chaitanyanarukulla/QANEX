/**
 * SprintStatus Value Object (Enumeration)
 *
 * Represents the lifecycle state of a sprint.
 *
 * State Transitions:
 * - PLANNED (initial) → ACTIVE (when sprint starts)
 * - ACTIVE → COMPLETED (when sprint ends)
 * - ACTIVE → CANCELLED (if needed)
 *
 * Only valid transitions are allowed.
 */
export enum SprintStatus {
  /**
   * Sprint has been created but not yet started.
   * Items can be added/removed in this state.
   */
  PLANNED = 'PLANNED',

  /**
   * Sprint is currently active.
   * Team is working on sprint items.
   * Cannot add new items.
   */
  ACTIVE = 'ACTIVE',

  /**
   * Sprint has been completed.
   * All metrics have been calculated.
   * No changes allowed.
   */
  COMPLETED = 'COMPLETED',

  /**
   * Sprint was cancelled before completion.
   * Items may be moved to backlog.
   */
  CANCELLED = 'CANCELLED',
}

/**
 * Helper class for SprintStatus operations.
 */
export class SprintStatusHelper {
  /**
   * Check if transition from `current` to `next` is valid.
   */
  static isValidTransition(
    current: SprintStatus,
    next: SprintStatus,
  ): boolean {
    const validTransitions: Record<SprintStatus, SprintStatus[]> = {
      [SprintStatus.PLANNED]: [SprintStatus.ACTIVE, SprintStatus.CANCELLED],
      [SprintStatus.ACTIVE]: [SprintStatus.COMPLETED, SprintStatus.CANCELLED],
      [SprintStatus.COMPLETED]: [],
      [SprintStatus.CANCELLED]: [],
    };

    return validTransitions[current].includes(next);
  }

  /**
   * Get error message if transition is invalid.
   */
  static getTransitionError(
    current: SprintStatus,
    next: SprintStatus,
  ): string | null {
    if (this.isValidTransition(current, next)) {
      return null;
    }

    return `Cannot transition from ${current} to ${next}`;
  }

  /**
   * Get all valid next states for current state.
   */
  static getValidNextStates(current: SprintStatus): SprintStatus[] {
    const validTransitions: Record<SprintStatus, SprintStatus[]> = {
      [SprintStatus.PLANNED]: [SprintStatus.ACTIVE, SprintStatus.CANCELLED],
      [SprintStatus.ACTIVE]: [SprintStatus.COMPLETED, SprintStatus.CANCELLED],
      [SprintStatus.COMPLETED]: [],
      [SprintStatus.CANCELLED]: [],
    };

    return validTransitions[current];
  }

  /**
   * Check if sprint is in a terminal state (no more transitions possible).
   */
  static isTerminal(status: SprintStatus): boolean {
    return (
      status === SprintStatus.COMPLETED || status === SprintStatus.CANCELLED
    );
  }

  /**
   * Check if sprint is active (currently executing).
   */
  static isActive(status: SprintStatus): boolean {
    return status === SprintStatus.ACTIVE;
  }

  /**
   * Check if sprint is planned (not yet started).
   */
  static isPlanned(status: SprintStatus): boolean {
    return status === SprintStatus.PLANNED;
  }
}
