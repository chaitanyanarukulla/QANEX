/**
 * BugPriority Value Object
 *
 * Represents the priority level of a bug from business perspective.
 * Priority indicates the urgency of fixing the bug based on business impact.
 *
 * Priority Levels:
 * - P0 (Urgent): Must fix before next release, blocks deployment
 * - P1 (High): Should fix before release, significant impact
 * - P2 (Medium): Nice to fix, can defer if schedule tight
 * - P3 (Low): Can fix later, minimal business impact
 *
 * Note: Priority is independent of severity.
 * A HIGH severity bug might be P3 if it affects a rarely-used feature.
 * A LOW severity bug might be P1 if it affects critical business process.
 */

export enum BugPriorityLevel {
  P0 = 'P0',
  P1 = 'P1',
  P2 = 'P2',
  P3 = 'P3',
}

/**
 * Helper class for BugPriority operations
 */
export class BugPriorityHelper {
  /**
   * Get numeric weight for priority in queue ordering
   */
  static getWeight(priority: BugPriorityLevel): number {
    const weights: Record<BugPriorityLevel, number> = {
      [BugPriorityLevel.P0]: 100,
      [BugPriorityLevel.P1]: 75,
      [BugPriorityLevel.P2]: 40,
      [BugPriorityLevel.P3]: 10,
    };
    return weights[priority] || 0;
  }

  /**
   * Check if bug at this priority blocks release
   */
  static blocksRelease(priority: BugPriorityLevel): boolean {
    return priority === BugPriorityLevel.P0;
  }

  /**
   * Get target resolution time in days
   */
  static getTargetResolutionDays(priority: BugPriorityLevel): number {
    const targets: Record<BugPriorityLevel, number> = {
      [BugPriorityLevel.P0]: 1, // 1 day
      [BugPriorityLevel.P1]: 3, // 3 days
      [BugPriorityLevel.P2]: 7, // 7 days
      [BugPriorityLevel.P3]: 30, // 30 days
    };
    return targets[priority] || 30;
  }

  /**
   * Get human-readable description of priority
   */
  static getDescription(priority: BugPriorityLevel): string {
    const descriptions: Record<BugPriorityLevel, string> = {
      [BugPriorityLevel.P0]: 'Urgent - must fix immediately, blocks deployment',
      [BugPriorityLevel.P1]:
        'High - should fix before release, significant impact',
      [BugPriorityLevel.P2]: 'Medium - nice to fix, can defer if needed',
      [BugPriorityLevel.P3]: 'Low - can fix later, minimal impact',
    };
    return descriptions[priority] || 'Unknown priority';
  }

  /**
   * Compare two priorities
   * @returns negative if a < b (a is higher priority), 0 if a === b, positive if a > b
   */
  static compare(
    a: BugPriorityLevel,
    b: BugPriorityLevel,
  ): number {
    return this.getWeight(b) - this.getWeight(a); // Reverse for descending
  }

  /**
   * Check if priority requires immediate action
   */
  static isUrgent(priority: BugPriorityLevel): boolean {
    return priority === BugPriorityLevel.P0 || priority === BugPriorityLevel.P1;
  }

  /**
   * Suggest priority based on severity and business impact
   * This is a helper for triage workflow
   */
  static suggestFromContext(
    severity: string,
    affectsMainFlow: boolean,
  ): BugPriorityLevel {
    if (severity === 'CRITICAL' || affectsMainFlow) {
      return BugPriorityLevel.P0;
    }
    if (severity === 'HIGH') {
      return BugPriorityLevel.P1;
    }
    if (severity === 'MEDIUM') {
      return BugPriorityLevel.P2;
    }
    return BugPriorityLevel.P3;
  }
}
