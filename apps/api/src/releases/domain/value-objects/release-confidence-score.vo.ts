import { ValueObject } from '../../../common/domain/aggregate-root.interface';

/**
 * Release Confidence Score (RCS) Value Object
 *
 * Represents the release readiness assessment of a release candidate.
 * Aggregates 4 key pillars to determine if a release is ready for production.
 *
 * **Formula**:
 * ```
 * Final Score = (QT × 0.4) + (B × 0.3) + (RP × 0.2) + (SO × 0.1)
 * ```
 *
 * **Pillars** (each 0-100):
 *
 * 1. **Quality & Testing (QT)** - 40% weight
 *    - Metric: % of test cases passed
 *    - Source: TestKeysService.getLatestPassRate()
 *    - Thresholds: >= 80% for release
 *
 * 2. **Bugs (B)** - 30% weight
 *    - Base: 100 points
 *    - Deductions by severity:
 *      * Critical: -40 points each
 *      * High: -20 points each
 *      * Medium: -10 points each
 *      * Low: -2 points each
 *    - Floor: 0 (cannot go negative)
 *    - Requirement: 0 critical bugs for release
 *
 * 3. **Requirements & Planning (RP)** - 20% weight
 *    - Metric: % of requirements in READY state
 *    - Thresholds: >= 90% recommended (optional gate)
 *
 * 4. **Security & Operations (SO)** - 10% weight
 *    - Metric: Security checks passed
 *    - Source: SecurityOpsService.calculateSoScore()
 *    - Includes: Security scanning, compliance checks, ops readiness
 *
 * **Release Gates** (Must Pass):
 * - RCS Score >= 75
 * - Zero critical bugs
 * - Test Coverage >= 80%
 *
 * **Example**:
 * ```typescript
 * const rcs = new ReleaseConfidenceScore({
 *   qt: 85,  // 85% of tests passed
 *   b: 80,   // 1 high bug (100 - 20 = 80)
 *   rp: 95,  // 95% of requirements ready
 *   so: 90,  // Security checks passed
 * });
 *
 * rcs.getTotalScore();       // 85
 * rcs.passesGates();         // true if qt >= 80, rcs >= 75, no critical bugs
 * rcs.getReadinessStatus(); // 'READY', 'BLOCKED', 'WARNING'
 * ```
 */
export class ReleaseConfidenceScore implements ValueObject<ReleaseConfidenceScore> {
  // Pillar scores (0-100)
  private readonly qt: number; // Quality & Testing
  private readonly b: number;  // Bugs
  private readonly rp: number; // Requirements & Planning
  private readonly so: number; // Security & Operations

  // Calculated total score (0-100)
  private readonly totalScore: number;

  // Gate status details
  private readonly gateDetails: ReleaseGateDetails;

  // Constants
  private static readonly SCORE_MIN = 0;
  private static readonly SCORE_MAX = 100;
  private static readonly RCS_THRESHOLD = 75;
  private static readonly QT_THRESHOLD = 80;
  private static readonly RP_THRESHOLD = 90;

  /**
   * Create a new Release Confidence Score.
   *
   * @param qt Quality & Testing score (0-100)
   * @param b Bugs score (0-100)
   * @param rp Requirements & Planning score (0-100)
   * @param so Security & Operations score (0-100)
   * @param gateDetails Optional gate pass/fail details
   * @throws Error if any score is outside valid range
   */
  constructor(
    qt: number,
    b: number,
    rp: number,
    so: number,
    gateDetails?: ReleaseGateDetails,
  ) {
    // Validate all scores
    this.validateScore('QT (Quality & Testing)', qt);
    this.validateScore('B (Bugs)', b);
    this.validateScore('RP (Requirements & Planning)', rp);
    this.validateScore('SO (Security & Operations)', so);

    this.qt = qt;
    this.b = b;
    this.rp = rp;
    this.so = so;

    // Calculate total score using weighted formula
    this.totalScore = this.calculateTotalScore(qt, b, rp, so);

    // Set gate details or auto-evaluate
    this.gateDetails = gateDetails || this.evaluateGates(qt, b, rp, so);
  }

  /**
   * Validate that a score is within acceptable range (0-100).
   * @throws Error if score is invalid
   */
  private validateScore(name: string, value: number): void {
    if (!Number.isFinite(value)) {
      throw new Error(`Invalid ${name}: ${value}. Must be a finite number.`);
    }

    if (value < ReleaseConfidenceScore.SCORE_MIN || value > ReleaseConfidenceScore.SCORE_MAX) {
      throw new Error(
        `Invalid ${name}: ${value}. Must be between ${ReleaseConfidenceScore.SCORE_MIN} ` +
        `and ${ReleaseConfidenceScore.SCORE_MAX}.`,
      );
    }
  }

  /**
   * Calculate total RCS using weighted formula.
   * Formula: (QT × 0.4) + (B × 0.3) + (RP × 0.2) + (SO × 0.1)
   */
  private calculateTotalScore(qt: number, b: number, rp: number, so: number): number {
    const weighted = (qt * 0.4) + (b * 0.3) + (rp * 0.2) + (so * 0.1);
    return Math.round(weighted);
  }

  /**
   * Evaluate which release gates pass/fail.
   */
  private evaluateGates(qt: number, b: number, rp: number, so: number): ReleaseGateDetails {
    return {
      rcsScorePassed: this.totalScore >= ReleaseConfidenceScore.RCS_THRESHOLD,
      testCoveragePassed: qt >= ReleaseConfidenceScore.QT_THRESHOLD,
      requirementsReadinessPassed: rp >= ReleaseConfidenceScore.RP_THRESHOLD,
      securityChecksPassed: so >= 70, // 70% threshold for SO
      criticalBugsFailed: false, // Set by caller based on bug count
    };
  }

  /**
   * Get Quality & Testing pillar score.
   */
  getQT(): number {
    return this.qt;
  }

  /**
   * Get Bugs pillar score.
   */
  getB(): number {
    return this.b;
  }

  /**
   * Get Requirements & Planning pillar score.
   */
  getRP(): number {
    return this.rp;
  }

  /**
   * Get Security & Operations pillar score.
   */
  getSO(): number {
    return this.so;
  }

  /**
   * Get the calculated total RCS score (0-100).
   */
  getTotalScore(): number {
    return this.totalScore;
  }

  /**
   * Check if this release passes all critical gates for production release.
   *
   * Critical Gates:
   * - RCS Score >= 75
   * - Test Coverage >= 80%
   * - Zero critical bugs
   *
   * @returns true if all critical gates pass
   */
  passesAllGates(): boolean {
    return (
      this.gateDetails.rcsScorePassed &&
      this.gateDetails.testCoveragePassed &&
      !this.gateDetails.criticalBugsFailed
    );
  }

  /**
   * Check if RCS score meets minimum threshold (75).
   */
  passesRCSGate(): boolean {
    return this.gateDetails.rcsScorePassed;
  }

  /**
   * Check if test coverage meets minimum threshold (80%).
   */
  passesTestCoverageGate(): boolean {
    return this.gateDetails.testCoveragePassed;
  }

  /**
   * Check if requirements readiness is sufficient (90%+).
   * This is a recommended gate, not a hard blocker.
   */
  passesRequirementsGate(): boolean {
    return this.gateDetails.requirementsReadinessPassed;
  }

  /**
   * Check if security checks passed.
   */
  passesSecurityGate(): boolean {
    return this.gateDetails.securityChecksPassed;
  }

  /**
   * Check if critical bugs prevent release.
   */
  hasCriticalBugBlock(): boolean {
    return this.gateDetails.criticalBugsFailed;
  }

  /**
   * Get readiness status for human-readable display.
   *
   * @returns 'READY' | 'BLOCKED' | 'WARNING'
   */
  getReadinessStatus(): ReadinessStatus {
    if (this.passesAllGates()) {
      return ReadinessStatus.READY;
    }

    if (this.hasCriticalBugBlock() || this.totalScore < 50) {
      return ReadinessStatus.BLOCKED;
    }

    return ReadinessStatus.WARNING;
  }

  /**
   * Get reasons why release is blocked/warning.
   * Returns array of blocking/warning issues.
   */
  getBlockingReasons(): string[] {
    const reasons: string[] = [];

    if (this.hasCriticalBugBlock()) {
      reasons.push('Critical bugs present - must be resolved before release');
    }

    if (!this.gateDetails.rcsScorePassed) {
      reasons.push(
        `RCS score too low (${this.totalScore}/${ReleaseConfidenceScore.RCS_THRESHOLD})`,
      );
    }

    if (!this.gateDetails.testCoveragePassed) {
      reasons.push(
        `Test coverage insufficient (${this.qt}/${ReleaseConfidenceScore.QT_THRESHOLD}%)`,
      );
    }

    if (!this.gateDetails.requirementsReadinessPassed && this.totalScore < 75) {
      reasons.push(
        `Requirements readiness low (${this.rp}/${ReleaseConfidenceScore.RP_THRESHOLD}%)`,
      );
    }

    return reasons;
  }

  /**
   * Get detailed breakdown of all pillars and gates.
   */
  getDetailedBreakdown(): ReleaseScoreBreakdown {
    return {
      totalScore: this.totalScore,
      pillars: {
        qualityTesting: {
          score: this.qt,
          weight: 0.4,
          contribution: Math.round(this.qt * 0.4),
          threshold: ReleaseConfidenceScore.QT_THRESHOLD,
          passed: this.passesTestCoverageGate(),
        },
        bugs: {
          score: this.b,
          weight: 0.3,
          contribution: Math.round(this.b * 0.3),
          threshold: 0, // No bugs allowed
          passed: this.b === 100, // Ideal
        },
        requirementsPlanning: {
          score: this.rp,
          weight: 0.2,
          contribution: Math.round(this.rp * 0.2),
          threshold: ReleaseConfidenceScore.RP_THRESHOLD,
          passed: this.passesRequirementsGate(),
        },
        securityOps: {
          score: this.so,
          weight: 0.1,
          contribution: Math.round(this.so * 0.1),
          threshold: 70,
          passed: this.passesSecurityGate(),
        },
      },
      gates: {
        rcsScore: {
          passed: this.passesRCSGate(),
          threshold: ReleaseConfidenceScore.RCS_THRESHOLD,
          current: this.totalScore,
        },
        testCoverage: {
          passed: this.passesTestCoverageGate(),
          threshold: ReleaseConfidenceScore.QT_THRESHOLD,
          current: this.qt,
        },
        criticalBugs: {
          passed: !this.hasCriticalBugBlock(),
          threshold: 0,
          current: this.gateDetails.criticalBugsFailed ? 1 : 0,
        },
      },
      readinessStatus: this.getReadinessStatus(),
      blockingReasons: this.getBlockingReasons(),
    };
  }

  /**
   * Get recommended next steps to improve release readiness.
   */
  getImprovementRecommendations(): string[] {
    const recommendations: string[] = [];

    if (this.qt < ReleaseConfidenceScore.QT_THRESHOLD) {
      recommendations.push(
        `Improve test coverage: currently ${this.qt}%, need ${ReleaseConfidenceScore.QT_THRESHOLD}%`,
      );
    }

    if (this.b < 100) {
      recommendations.push('Fix remaining bugs to improve confidence score');
    }

    if (this.rp < ReleaseConfidenceScore.RP_THRESHOLD) {
      recommendations.push(
        `Complete more requirements: ${this.rp}% ready, aiming for ${ReleaseConfidenceScore.RP_THRESHOLD}%`,
      );
    }

    if (this.so < 70) {
      recommendations.push('Address security and operational concerns');
    }

    if (recommendations.length === 0) {
      recommendations.push('Release is ready! All gates passed.');
    }

    return recommendations;
  }

  /**
   * Check equality by comparing all pillar scores.
   */
  equals(other: ValueObject<ReleaseConfidenceScore>): boolean {
    if (!(other instanceof ReleaseConfidenceScore)) {
      return false;
    }

    return (
      this.qt === other.qt &&
      this.b === other.b &&
      this.rp === other.rp &&
      this.so === other.so
    );
  }

  /**
   * Get the value of this value object.
   */
  getValue(): ReleaseConfidenceScore {
    return this;
  }

  /**
   * Convert to JSON for serialization.
   */
  toJSON(): ReleaseScoreJSON {
    return {
      totalScore: this.totalScore,
      qt: this.qt,
      b: this.b,
      rp: this.rp,
      so: this.so,
      readinessStatus: this.getReadinessStatus(),
      passesAllGates: this.passesAllGates(),
      breakdown: this.getDetailedBreakdown(),
    };
  }

  /**
   * Create RCS from JSON (deserialization).
   */
  static fromJSON(data: {
    qt: number;
    b: number;
    rp: number;
    so: number;
  }): ReleaseConfidenceScore {
    return new ReleaseConfidenceScore(data.qt, data.b, data.rp, data.so);
  }

  /**
   * Create RCS from bug metrics.
   * Used to calculate B (Bugs) pillar from actual bug counts.
   *
   * Example:
   * ```typescript
   * const rcs = ReleaseConfidenceScore.fromBugMetrics(
   *   { critical: 0, high: 1, medium: 2, low: 3 },
   *   { qt: 85, rp: 90, so: 85 }
   * );
   * ```
   */
  static fromBugMetrics(
    bugCounts: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    },
    otherScores: { qt: number; rp: number; so: number },
  ): ReleaseConfidenceScore {
    let bugScore = 100; // Start at perfect
    bugScore -= bugCounts.critical * 40;
    bugScore -= bugCounts.high * 20;
    bugScore -= bugCounts.medium * 10;
    bugScore -= bugCounts.low * 2;

    // Floor at 0
    bugScore = Math.max(0, bugScore);

    const gateDetails: ReleaseGateDetails = {
      rcsScorePassed: false, // Will be set after total calculation
      testCoveragePassed: otherScores.qt >= 80,
      requirementsReadinessPassed: otherScores.rp >= 90,
      securityChecksPassed: otherScores.so >= 70,
      criticalBugsFailed: bugCounts.critical > 0,
    };

    const rcs = new ReleaseConfidenceScore(
      otherScores.qt,
      bugScore,
      otherScores.rp,
      otherScores.so,
      gateDetails,
    );

    // Update gate after total calculation
    rcs.gateDetails.rcsScorePassed = rcs.totalScore >= ReleaseConfidenceScore.RCS_THRESHOLD;

    return rcs;
  }

  /**
   * String representation for logging.
   */
  toString(): string {
    return (
      `RCS(${this.totalScore}) - QT:${this.qt}% B:${this.b} RP:${this.rp}% SO:${this.so}% - ` +
      `Status: ${this.getReadinessStatus()}`
    );
  }
}

/**
 * Release Readiness Status
 */
export enum ReadinessStatus {
  /**
   * All gates passed, ready for production release.
   */
  READY = 'READY',

  /**
   * Some gates not passed, warnings but not blocking.
   * Can override if approved.
   */
  WARNING = 'WARNING',

  /**
   * Critical issues blocking release.
   * Must resolve before proceeding.
   */
  BLOCKED = 'BLOCKED',
}

/**
 * Gate evaluation results.
 */
export interface ReleaseGateDetails {
  rcsScorePassed: boolean;
  testCoveragePassed: boolean;
  requirementsReadinessPassed: boolean;
  securityChecksPassed: boolean;
  criticalBugsFailed: boolean;
}

/**
 * Detailed RCS breakdown for analysis.
 */
export interface ReleaseScoreBreakdown {
  totalScore: number;
  pillars: {
    qualityTesting: PillarScore;
    bugs: PillarScore;
    requirementsPlanning: PillarScore;
    securityOps: PillarScore;
  };
  gates: {
    rcsScore: GateEvaluation;
    testCoverage: GateEvaluation;
    criticalBugs: GateEvaluation;
  };
  readinessStatus: ReadinessStatus;
  blockingReasons: string[];
}

/**
 * Individual pillar score breakdown.
 */
export interface PillarScore {
  score: number;
  weight: number;
  contribution: number;
  threshold: number;
  passed: boolean;
}

/**
 * Individual gate evaluation.
 */
export interface GateEvaluation {
  passed: boolean;
  threshold: number;
  current: number;
}

/**
 * JSON representation of RCS.
 */
export interface ReleaseScoreJSON {
  totalScore: number;
  qt: number;
  b: number;
  rp: number;
  so: number;
  readinessStatus: ReadinessStatus;
  passesAllGates: boolean;
  breakdown: ReleaseScoreBreakdown;
}
