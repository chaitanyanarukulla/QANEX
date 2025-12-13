import { BaseDomainAggregate } from '../../common/domain/aggregate-root.interface';
import {
  ReleaseConfidenceScore,
  ReadinessStatus,
} from './value-objects/release-confidence-score.vo';
import { ReleaseStatus } from './value-objects/release-status.vo';
import { ReleaseCreated } from './events/release-created.event';
import { ReleaseReadinessEvaluated } from './events/release-readiness-evaluated.event';
import { ReleaseReadinessAchieved } from './events/release-readiness-achieved.event';
import { ReleaseBlocked } from './events/release-blocked.event';

/**
 * Release Aggregate Root
 *
 * Represents a production release candidate and manages its readiness assessment.
 * Orchestrates data from multiple bounded contexts (Requirements, Bugs, Tests, Security)
 * via anti-corruption layers to determine if release is ready.
 *
 * Invariants (Domain Rules):
 * 1. Release version must be unique per tenant
 * 2. Release can only transition: PLANNED → ACTIVE → FROZEN → RELEASED
 * 3. Release can be BLOCKED from ACTIVE or FROZEN state if critical issues emerge
 * 4. RCS can only be calculated once; subsequent evaluations update existing score
 * 5. Cannot release if RCS < 75 or critical bugs present
 * 6. Readiness must be achieved before release
 *
 * Domain Events Published:
 * - ReleaseCreated: New release initialized
 * - ReleaseReadinessEvaluated: RCS calculation completed
 * - ReleaseReadinessAchieved: All gates passed
 * - ReleaseBlocked: Critical issues discovered
 *
 * Cross-Context Dependencies:
 * - Requirements context: For requirements readiness metrics
 * - Bugs context: For bug severity and count
 * - Test Management context: For test pass rate
 * - Security & Ops context: For security checks
 *
 * Uses Anti-Corruption Layer (ReleaseReadinessAdapter) to query these contexts
 * without exposing their internal models.
 *
 * Example:
 * ```typescript
 * const release = Release.create({
 *   id: 'rel-1',
 *   tenantId: 'tenant-1',
 *   version: '1.0.0',
 *   environment: 'production',
 *   userId: 'user-1'
 * });
 *
 * // Later: Evaluate readiness using adapter data
 * const readinessData = await adapter.getReadinessData(tenantId);
 * release.evaluateReadiness(readinessData);
 *
 * // Check if ready
 * if (release.isReady()) {
 *   release.release();
 * }
 *
 * // Save and publish
 * await repo.save(release);
 * await eventPublisher.publishAll(release.getDomainEvents());
 * ```
 */
export class Release extends BaseDomainAggregate {
  public id: string;
  public tenantId: string;
  public version: string;
  public environment: string;
  public status: ReleaseStatus;
  public readinessScore?: ReleaseConfidenceScore;
  public readinessStatus?: ReadinessStatus;
  public blockingReasons: string[] = [];
  public createdAt: Date;
  public updatedAt: Date;
  public readinessEvaluatedAt?: Date;
  public releasedAt?: Date;

  constructor(
    id: string,
    tenantId: string,
    version: string,
    environment: string = 'production',
    status: ReleaseStatus = ReleaseStatus.PLANNED,
  ) {
    super();
    this.id = id;
    this.tenantId = tenantId;
    this.version = version;
    this.environment = environment;
    this.status = status;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Factory method to create a new release.
   * Publishes ReleaseCreated event.
   *
   * @throws Error if version format is invalid
   */
  public static create(params: {
    id: string;
    tenantId: string;
    version: string;
    environment?: string;
    userId?: string;
  }): Release {
    // Validate version format (semver: x.y.z)
    if (!this.isValidVersion(params.version)) {
      throw new Error(
        `Invalid version format: ${params.version}. Expected semantic versioning (x.y.z).`,
      );
    }

    const release = new Release(
      params.id,
      params.tenantId,
      params.version,
      params.environment || 'production',
      ReleaseStatus.PLANNED,
    );

    // Publish domain event
    release.addDomainEvent(
      new ReleaseCreated(release.id, release.tenantId, release.version, {
        userId: params.userId,
        environment: params.environment,
      }),
    );

    return release;
  }

  /**
   * Validate semantic version format.
   */
  private static isValidVersion(version: string): boolean {
    const semverRegex = /^\d+\.\d+\.\d+(-[\da-z-]*)?(\+[\da-z-]*)?$/i;
    return semverRegex.test(version);
  }

  /**
   * Evaluate release readiness by aggregating metrics from multiple contexts.
   *
   * This method orchestrates data from Requirements, Bugs, Tests, and Security contexts
   * to calculate the Release Confidence Score (RCS).
   *
   * Called via anti-corruption layer (ReleaseReadinessAdapter) which provides:
   * - Requirements readiness percentage
   * - Bug counts by severity
   * - Test pass rate
   * - Security check results
   *
   * @param readinessData Pre-aggregated metrics from adapter
   * @throws Error if release is in terminal state
   */
  public evaluateReadiness(readinessData: ReleaseReadinessData): void {
    if (this.isInTerminalState()) {
      throw new Error(
        `Cannot evaluate readiness for ${this.status} release. ` +
          `Evaluation only allowed for PLANNED, ACTIVE, or FROZEN releases.`,
      );
    }

    // Create RCS from bug metrics
    const rcs = ReleaseConfidenceScore.fromBugMetrics(readinessData.bugCounts, {
      qt: readinessData.testPassRate,
      rp: readinessData.requirementsReadinessPercentage,
      so: readinessData.securityScorePercentage,
    });

    this.readinessScore = rcs;
    this.readinessStatus = rcs.getReadinessStatus();
    this.blockingReasons = rcs.getBlockingReasons();
    this.readinessEvaluatedAt = new Date();
    this.updatedAt = new Date();

    // Publish evaluation event
    this.addDomainEvent(
      new ReleaseReadinessEvaluated(this.id, this.tenantId, {
        version: this.version,
        score: rcs.getTotalScore(),
        status: this.readinessStatus,
        passesAllGates: rcs.passesAllGates(),
      }),
    );

    // If readiness achieved, publish additional event
    if (rcs.passesAllGates()) {
      this.addDomainEvent(
        new ReleaseReadinessAchieved(this.id, this.tenantId, {
          version: this.version,
          score: rcs.getTotalScore(),
        }),
      );
    }
  }

  /**
   * Activate the release (move to ACTIVE status).
   *
   * Domain Rules:
   * - Release must be in PLANNED status
   * - Readiness must have been evaluated
   *
   * @throws InvalidStateError if not PLANNED
   * @throws ReadinessNotEvaluatedError if readiness not evaluated
   */
  public activate(_userId?: string): void {
    if (this.status !== ReleaseStatus.PLANNED) {
      throw new Error(
        `Cannot activate ${this.status} release. Only PLANNED releases can be activated.`,
      );
    }

    if (!this.readinessScore) {
      throw new Error(
        'Cannot activate release without readiness evaluation. ' +
          'Call evaluateReadiness() first.',
      );
    }

    this.status = ReleaseStatus.ACTIVE;
    this.updatedAt = new Date();
  }

  /**
   * Freeze the release (move to FROZEN status).
   * Indicates release is locked and ready for final approval.
   *
   * @throws InvalidStateError if not ACTIVE
   */
  public freeze(_userId?: string): void {
    if (this.status !== ReleaseStatus.ACTIVE) {
      throw new Error(
        `Cannot freeze ${this.status} release. Only ACTIVE releases can be frozen.`,
      );
    }

    this.status = ReleaseStatus.FROZEN;
    this.updatedAt = new Date();
  }

  /**
   * Release to production (move to RELEASED status).
   *
   * Domain Rules:
   * - Release must pass all readiness gates
   * - No critical bugs present
   * - RCS score >= 75
   *
   * @throws InvalidStateError if gates not passed
   * @throws CannotReleaseError if critical issues present
   */
  public release(_userId?: string): void {
    if (!this.readinessScore) {
      throw new Error(
        'Cannot release without readiness evaluation. ' +
          'Call evaluateReadiness() first.',
      );
    }

    if (!this.readinessScore.passesAllGates()) {
      throw new Error(
        `Cannot release: ${this.blockingReasons.join(', ')}. ` +
          `Address blocking issues before proceeding.`,
      );
    }

    this.status = ReleaseStatus.RELEASED;
    this.releasedAt = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Block the release due to critical issues discovered after evaluation.
   *
   * Domain Rules:
   * - Can be called from ACTIVE or FROZEN states
   * - Requires reason explaining the block
   *
   * @throws InvalidStateError if release is not ACTIVE or FROZEN
   */
  public block(reason: string, userId?: string): void {
    if (
      this.status === ReleaseStatus.PLANNED ||
      this.status === ReleaseStatus.RELEASED
    ) {
      throw new Error(
        `Cannot block ${this.status} release. ` +
          `Only ACTIVE or FROZEN releases can be blocked.`,
      );
    }

    this.status = ReleaseStatus.BLOCKED;
    this.blockingReasons = [reason];
    this.updatedAt = new Date();

    // Publish blocking event
    this.addDomainEvent(
      new ReleaseBlocked(this.id, this.tenantId, {
        version: this.version,
        reason,
        userId,
      }),
    );
  }

  /**
   * Re-evaluate readiness after issues have been fixed.
   * Can be called from BLOCKED state to reassess.
   *
   * @throws InvalidStateError if release is RELEASED or ABORTED
   */
  public reEvaluateReadiness(readinessData: ReleaseReadinessData): void {
    if (
      this.status === ReleaseStatus.RELEASED ||
      this.status === ReleaseStatus.ABORTED
    ) {
      throw new Error(
        `Cannot re-evaluate ${this.status} release. ` +
          `Only PLANNED, ACTIVE, FROZEN, or BLOCKED releases can be re-evaluated.`,
      );
    }

    // Reset to ACTIVE if was BLOCKED
    if (this.status === ReleaseStatus.BLOCKED) {
      this.status = ReleaseStatus.ACTIVE;
    }

    // Evaluate readiness again
    this.evaluateReadiness(readinessData);
  }

  /**
   * Abort the release.
   *
   * Domain Rules:
   * - Can be called from any non-terminal state
   * - RELEASED and ABORTED are terminal states
   *
   * @throws InvalidStateError if release is already in terminal state
   */
  public abort(reason: string, _userId?: string): void {
    if (
      this.status === ReleaseStatus.RELEASED ||
      this.status === ReleaseStatus.ABORTED
    ) {
      throw new Error(
        `Cannot abort ${this.status} release. ` +
          `Release is in terminal state.`,
      );
    }

    this.status = ReleaseStatus.ABORTED;
    this.blockingReasons = [reason];
    this.updatedAt = new Date();
  }

  /**
   * Check if release has been evaluated for readiness.
   */
  public isEvaluated(): boolean {
    return !!this.readinessScore && !!this.readinessEvaluatedAt;
  }

  /**
   * Check if release is ready for production.
   * Requires: RCS score >= 75, no critical bugs, test coverage >= 80%
   */
  public isReady(): boolean {
    if (!this.readinessScore) {
      return false;
    }

    return this.readinessScore.passesAllGates();
  }

  /**
   * Check if release has been released to production.
   */
  public isReleased(): boolean {
    return this.status === ReleaseStatus.RELEASED && !!this.releasedAt;
  }

  /**
   * Check if release is in a terminal state (no more transitions possible).
   */
  private isInTerminalState(): boolean {
    return (
      this.status === ReleaseStatus.RELEASED ||
      this.status === ReleaseStatus.ABORTED
    );
  }

  /**
   * Get human-readable summary of release and its readiness.
   */
  public getSummary(): string {
    let summary = `Release ${this.version} (${this.status})`;

    if (this.readinessScore) {
      summary += ` - RCS: ${this.readinessScore.getTotalScore()}/100`;
      summary += ` - Status: ${this.readinessStatus}`;
    }

    return summary;
  }

  /**
   * Get detailed release information for display.
   */
  public getDetails(): ReleaseDetails {
    return {
      id: this.id,
      version: this.version,
      environment: this.environment,
      status: this.status,
      readinessStatus: this.readinessStatus,
      readinessScore: this.readinessScore?.toJSON(),
      blockingReasons: this.blockingReasons,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      readinessEvaluatedAt: this.readinessEvaluatedAt,
      releasedAt: this.releasedAt,
    };
  }
}

/**
 * Readiness data aggregated from multiple contexts.
 * Provided by ReleaseReadinessAdapter from other bounded contexts.
 */
export interface ReleaseReadinessData {
  // From Test Management context
  testPassRate: number; // 0-100 percentage

  // From Requirements context
  requirementsReadinessPercentage: number; // 0-100 percentage

  // From Bugs context
  bugCounts: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };

  // From Security & Ops context
  securityScorePercentage: number; // 0-100 percentage
}

/**
 * Release details for external consumption.
 */
export interface ReleaseDetails {
  id: string;
  version: string;
  environment: string;
  status: ReleaseStatus;
  readinessStatus?: ReadinessStatus;
  readinessScore?: any; // ReleaseScoreJSON
  blockingReasons: string[];
  createdAt: Date;
  updatedAt: Date;
  readinessEvaluatedAt?: Date;
  releasedAt?: Date;
}
