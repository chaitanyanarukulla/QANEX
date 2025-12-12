/**
 * BugSeverity Value Object
 *
 * Represents the severity level of a bug from end-user perspective.
 * Severity indicates the impact on system functionality.
 *
 * Severity Levels:
 * - CRITICAL: System down, data loss, security breach
 * - HIGH: Major feature broken, severe data corruption
 * - MEDIUM: Feature partially broken, workaround exists
 * - LOW: Minor feature issue, cosmetic, no impact on core functionality
 *
 * Severity affects:
 * - Release gate calculations (critical bugs block release)
 * - Priority in triage queue
 * - SLA response times
 */

export enum BugSeverityLevel {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

/**
 * Helper class for BugSeverity operations
 */
export class BugSeverityHelper {
  /**
   * Get numeric weight for severity (used in RCS calculations)
   * Higher weight = more impactful on release readiness
   */
  static getWeight(severity: BugSeverityLevel): number {
    const weights: Record<BugSeverityLevel, number> = {
      [BugSeverityLevel.CRITICAL]: 100,
      [BugSeverityLevel.HIGH]: 75,
      [BugSeverityLevel.MEDIUM]: 40,
      [BugSeverityLevel.LOW]: 10,
    };
    return weights[severity] || 0;
  }

  /**
   * Check if bug at this severity blocks release
   */
  static blocksRelease(severity: BugSeverityLevel): boolean {
    return severity === BugSeverityLevel.CRITICAL;
  }

  /**
   * Get SLA response time in hours for severity
   */
  static getSLAResponseHours(severity: BugSeverityLevel): number {
    const slas: Record<BugSeverityLevel, number> = {
      [BugSeverityLevel.CRITICAL]: 1, // 1 hour
      [BugSeverityLevel.HIGH]: 4, // 4 hours
      [BugSeverityLevel.MEDIUM]: 24, // 24 hours
      [BugSeverityLevel.LOW]: 72, // 72 hours
    };
    return slas[severity] || 72;
  }

  /**
   * Get human-readable description of severity
   */
  static getDescription(severity: BugSeverityLevel): string {
    const descriptions: Record<BugSeverityLevel, string> = {
      [BugSeverityLevel.CRITICAL]:
        'System down or critical data loss - requires immediate fix',
      [BugSeverityLevel.HIGH]:
        'Major feature broken or severe data corruption - high priority',
      [BugSeverityLevel.MEDIUM]:
        'Feature partially broken or degraded - standard priority',
      [BugSeverityLevel.LOW]: 'Minor issue or cosmetic problem - low priority',
    };
    return descriptions[severity] || 'Unknown severity';
  }

  /**
   * Compare two severities
   * @returns negative if a < b, 0 if a === b, positive if a > b
   */
  static compare(a: BugSeverityLevel, b: BugSeverityLevel): number {
    return this.getWeight(b) - this.getWeight(a); // Reverse for descending
  }

  /**
   * Check if severity is blocking category
   */
  static isBlocking(severity: BugSeverityLevel): boolean {
    return (
      severity === BugSeverityLevel.CRITICAL ||
      severity === BugSeverityLevel.HIGH
    );
  }
}
