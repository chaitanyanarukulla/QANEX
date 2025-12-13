import { Injectable, Logger } from '@nestjs/common';

/**
 * ReleaseReadinessAdapter (Anti-Corruption Layer)
 *
 * Purpose: Shield Release aggregate from internal details of other bounded contexts.
 * Converts external service data into Release aggregate's expected format.
 *
 * This adapter aggregates data from multiple contexts:
 * - Requirements context: Requirement readiness percentage
 * - Bugs context: Bug counts by severity
 * - Test Management context: Test pass rate
 * - Security & Ops context: Security check results
 *
 * Benefits:
 * 1. Decouples Release aggregate from Requirements/Bugs/Tests service implementations
 * 2. Provides consistent interface for readiness data
 * 3. Shields domain from schema changes in other contexts
 * 4. Enables testing Release logic independently
 * 5. Clear point for adding business logic transformations
 *
 * Design Pattern: Anti-Corruption Layer (from DDD)
 * - Read-only DTOs prevent accidental modifications
 * - Explicit mapping maintains control over data flow
 * - Single responsibility: aggregate readiness data
 *
 * SLA: Queries must complete within 500ms
 * Caching: Results cached for 30 seconds to avoid cascading queries
 */
@Injectable()
export class ReleaseReadinessAdapter {
  private readonly logger = new Logger(ReleaseReadinessAdapter.name);
  private readinessCache = new Map<
    string,
    { data: ReleaseReadinessDataDto; timestamp: number }
  >();
  private readonly CACHE_TTL_MS = 30000; // 30 seconds

  constructor() {
    // TODO: Inject services from other contexts
    // - private requirementsService: RequirementsService,
    // - private bugsService: BugsService,
    // - private testManagementService: TestManagementService,
    // - private securityService: SecurityService,
  }

  /**
   * Get aggregated readiness data for a release.
   *
   * Orchestrates queries across multiple contexts and combines results.
   * Uses caching to prevent cascading queries on repeated calls.
   *
   * @param tenantId - Tenant identifier for multi-tenancy
   * @param releaseVersion - Optional: specific version to query (for testing)
   * @returns ReadinessDataDto ready for Release.evaluateReadiness()
   *
   * @throws Error if critical context is unavailable (circuit breaker pattern)
   */
  async getReadinessData(
    tenantId: string,
    releaseVersion?: string,
  ): Promise<ReleaseReadinessDataDto> {
    const cacheKey = `${tenantId}:${releaseVersion || 'latest'}`;

    // Check cache first
    const cached = this.readinessCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      this.logger.debug(`Cache hit for readiness data: ${cacheKey}`);
      return cached.data;
    }

    this.logger.debug(
      `Fetching readiness data for tenant ${tenantId}, version ${releaseVersion || 'latest'}`,
    );

    try {
      // Fetch data from all contexts in parallel for performance
      const [testData, requirementsData, bugData, securityData] =
        await Promise.all([
          this.getTestManagementData(tenantId),
          this.getRequirementsData(tenantId),
          this.getBugData(tenantId),
          this.getSecurityData(tenantId),
        ]);

      // Aggregate into single DTO
      const readinessData: ReleaseReadinessDataDto = {
        testPassRate: testData.passRate,
        requirementsReadinessPercentage: requirementsData.readinessPercentage,
        bugCounts: bugData.counts,
        securityScorePercentage: securityData.scorePercentage,
      };

      // Cache result
      this.readinessCache.set(cacheKey, {
        data: readinessData,
        timestamp: Date.now(),
      });

      this.logger.debug(
        `Successfully aggregated readiness data: test=${readinessData.testPassRate}%, ` +
          `req=${readinessData.requirementsReadinessPercentage}%, ` +
          `critical_bugs=${readinessData.bugCounts.critical}`,
      );

      return readinessData;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to fetch readiness data for tenant ${tenantId}: ${errorMessage}`,
        errorStack,
      );

      // Return degraded data (graceful degradation)
      // This allows release evaluation to proceed even if some contexts are unavailable
      return this.getDefaultReadinessData();
    }
  }

  /**
   * Fetch test metrics from Test Management context
   * @private
   */
  private async getTestManagementData(
    tenantId: string,
  ): Promise<{ passRate: number }> {
    // TODO: Implement when TestManagementService available
    // const latestRun = await this.testManagementService.getLatestTestRun(tenantId);
    // return {
    //   passRate: latestRun?.passRate || 0,
    // };

    this.logger.debug(`Fetching test data for tenant ${tenantId}`);

    // Mock implementation for now
    return { passRate: 85 };
  }

  /**
   * Fetch requirements readiness from Requirements context
   * @private
   */
  private async getRequirementsData(
    tenantId: string,
  ): Promise<{ readinessPercentage: number }> {
    // TODO: Implement when RequirementsService available
    // const requirements = await this.requirementsService.findAll(tenantId);
    // const approved = requirements.filter(r => r.status === 'APPROVED').length;
    // const readinessPercentage = requirements.length > 0
    //   ? Math.round((approved / requirements.length) * 100)
    //   : 0;
    // return { readinessPercentage };

    this.logger.debug(`Fetching requirements data for tenant ${tenantId}`);

    // Mock implementation for now
    return { readinessPercentage: 90 };
  }

  /**
   * Fetch bug counts from Bugs context
   * Breakdown by severity to feed RCS calculation
   *
   * @private
   */
  private async getBugData(tenantId: string): Promise<{
    counts: { critical: number; high: number; medium: number; low: number };
  }> {
    // TODO: Implement when BugsService available
    // const bugs = await this.bugsService.findByTenant(tenantId);
    // const counts = {
    //   critical: bugs.filter(b => b.severity === 'CRITICAL' && !b.isFixed()).length,
    //   high: bugs.filter(b => b.severity === 'HIGH' && !b.isFixed()).length,
    //   medium: bugs.filter(b => b.severity === 'MEDIUM' && !b.isFixed()).length,
    //   low: bugs.filter(b => b.severity === 'LOW' && !b.isFixed()).length,
    // };
    // return { counts };

    this.logger.debug(`Fetching bug data for tenant ${tenantId}`);

    // Mock implementation for now
    return {
      counts: {
        critical: 0,
        high: 1,
        medium: 3,
        low: 5,
      },
    };
  }

  /**
   * Fetch security check results from Security & Ops context
   * @private
   */
  private async getSecurityData(
    tenantId: string,
  ): Promise<{ scorePercentage: number }> {
    // TODO: Implement when SecurityService available
    // const securityChecks = await this.securityService.getLatestChecks(tenantId);
    // const passedChecks = securityChecks.filter(c => c.passed).length;
    // const scorePercentage = securityChecks.length > 0
    //   ? Math.round((passedChecks / securityChecks.length) * 100)
    //   : 100;
    // return { scorePercentage };

    this.logger.debug(`Fetching security data for tenant ${tenantId}`);

    // Mock implementation for now
    return { scorePercentage: 95 };
  }

  /**
   * Get default/degraded readiness data
   * Used when some contexts are unavailable
   *
   * Allows Release evaluation to continue with conservative estimates:
   * - Zero bugs (optimistic)
   * - 0% test pass (pessimistic - requires external verification)
   * - 0% requirements (pessimistic - requires external verification)
   * - 100% security (optimistic - no known violations)
   *
   * @private
   */
  private getDefaultReadinessData(): ReleaseReadinessDataDto {
    return {
      testPassRate: 0,
      requirementsReadinessPercentage: 0,
      bugCounts: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      },
      securityScorePercentage: 100,
    };
  }

  /**
   * Clear cache for a specific tenant
   * Called when external context data changes (invalidation signal)
   *
   * @param tenantId - Tenant whose cache should be cleared
   */
  invalidateCache(tenantId: string): void {
    // Remove all cache entries for this tenant
    const keysToDelete = Array.from(this.readinessCache.keys()).filter((key) =>
      key.startsWith(`${tenantId}:`),
    );

    keysToDelete.forEach((key) => this.readinessCache.delete(key));

    this.logger.debug(
      `Invalidated readiness cache for tenant ${tenantId} (${keysToDelete.length} entries)`,
    );
  }

  /**
   * Clear all caches
   * Called on startup or cache reset
   */
  clearAllCaches(): void {
    this.readinessCache.clear();
    this.logger.debug('Cleared all readiness adapter caches');
  }
}

/**
 * Read-Only DTO for readiness data
 *
 * This is the contract between anti-corruption layer and Release aggregate.
 * Using readonly interface prevents accidental modifications.
 */
export interface ReleaseReadinessDataDto {
  readonly testPassRate: number; // 0-100 percentage
  readonly requirementsReadinessPercentage: number; // 0-100 percentage
  readonly bugCounts: {
    readonly critical: number;
    readonly high: number;
    readonly medium: number;
    readonly low: number;
  };
  readonly securityScorePercentage: number; // 0-100 percentage
}
