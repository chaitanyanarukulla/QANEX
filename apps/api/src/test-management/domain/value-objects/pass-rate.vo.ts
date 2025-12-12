/**
 * PassRate Value Object
 *
 * Represents test pass rate as a percentage (0-100).
 * Immutable, self-validating value object.
 *
 * Thresholds:
 * - EXCELLENT: >= 95%
 * - GOOD: 85-94%
 * - ACCEPTABLE: 75-84%
 * - NEEDS_ATTENTION: 50-74%
 * - CRITICAL: < 50%
 *
 * Used to evaluate test readiness for releases.
 * Minimum 80% pass rate required for release gate.
 */

export enum PassRateStatus {
  EXCELLENT = 'EXCELLENT',
  GOOD = 'GOOD',
  ACCEPTABLE = 'ACCEPTABLE',
  NEEDS_ATTENTION = 'NEEDS_ATTENTION',
  CRITICAL = 'CRITICAL',
}

/**
 * Helper class for PassRate operations
 */
export class PassRateHelper {
  /**
   * Get status for pass rate percentage
   */
  static getStatus(passRate: number): PassRateStatus {
    if (passRate >= 95) return PassRateStatus.EXCELLENT;
    if (passRate >= 85) return PassRateStatus.GOOD;
    if (passRate >= 75) return PassRateStatus.ACCEPTABLE;
    if (passRate >= 50) return PassRateStatus.NEEDS_ATTENTION;
    return PassRateStatus.CRITICAL;
  }

  /**
   * Check if pass rate meets release gate requirement (>= 80%)
   */
  static meetsReleaseGate(passRate: number): boolean {
    return passRate >= 80;
  }

  /**
   * Get human-readable description of status
   */
  static getStatusDescription(status: PassRateStatus): string {
    const descriptions: Record<PassRateStatus, string> = {
      [PassRateStatus.EXCELLENT]:
        'Excellent test coverage and pass rate - no action needed',
      [PassRateStatus.GOOD]: 'Good test results - minor improvements possible',
      [PassRateStatus.ACCEPTABLE]:
        'Acceptable pass rate - should address failing tests',
      [PassRateStatus.NEEDS_ATTENTION]:
        'Tests need attention - significant failures present',
      [PassRateStatus.CRITICAL]:
        'Critical - many tests failing, investigate immediately',
    };

    return descriptions[status] || 'Unknown status';
  }

  /**
   * Get color coding for UI (for dashboards)
   */
  static getStatusColor(status: PassRateStatus): string {
    const colors: Record<PassRateStatus, string> = {
      [PassRateStatus.EXCELLENT]: '#10b981', // green-500
      [PassRateStatus.GOOD]: '#3b82f6', // blue-500
      [PassRateStatus.ACCEPTABLE]: '#f59e0b', // amber-500
      [PassRateStatus.NEEDS_ATTENTION]: '#ef4444', // red-500
      [PassRateStatus.CRITICAL]: '#7f1d1d', // red-900
    };

    return colors[status] || '#6b7280';
  }

  /**
   * Calculate required additional passes to reach target
   */
  static getPassesNeededForTarget(
    currentPass: number,
    totalTests: number,
    targetRate: number,
  ): number {
    const targetPasses = Math.ceil((targetRate / 100) * totalTests);
    return Math.max(0, targetPasses - currentPass);
  }

  /**
   * Calculate trend indicator: improvement/decline/stable
   */
  static calculateTrend(
    previousRate: number,
    currentRate: number,
  ): 'IMPROVING' | 'DECLINING' | 'STABLE' {
    const difference = currentRate - previousRate;
    const threshold = 2; // 2% threshold for stability

    if (difference > threshold) return 'IMPROVING';
    if (difference < -threshold) return 'DECLINING';
    return 'STABLE';
  }
}
