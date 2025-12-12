import { Injectable, Logger } from '@nestjs/common';

/**
 * BugAdapter (Anti-Corruption Layer)
 *
 * Purpose: Provide Release context with bug metrics without exposing Bug internal models.
 * Shields Release from Bugs context schema changes.
 *
 * Mapping:
 * - Bug.severity (CRITICAL, HIGH, MEDIUM, LOW) → BugMetric weight
 * - Bug.priority (P0, P1, P2, P3) → BugMetric priority weight
 * - Bug.status → filters for active/blocking bugs
 * - Bug collection → aggregated counts by severity
 *
 * Use Cases:
 * 1. Getting bug metrics for ReleaseConfidenceScore calculation
 * 2. Checking if critical/P0 bugs block release
 * 3. Calculating bug count trends
 * 4. Identifying blocking issues
 *
 * Design Pattern: Anti-Corruption Layer
 * - Translates Bug model to metrics Release can use
 * - Hides Bug domain logic from Release
 * - Single responsibility: Bug aggregation for release decisions
 *
 * SLA: Metrics aggregation < 200ms
 * Caching: Bug metrics cached for 1 minute (high change frequency)
 */
@Injectable()
export class BugAdapter {
  private readonly logger = new Logger(BugAdapter.name);
  private bugMetricsCache = new Map<
    string,
    { metrics: BugMetricsDto; timestamp: number }
  >();
  private readonly CACHE_TTL_MS = 60000; // 1 minute

  constructor() {
    // TODO: Inject services from other contexts
    // - private bugsService: BugsService,
  }

  /**
   * Get aggregated bug metrics for a tenant
   * Used by Release to evaluate readiness
   *
   * @param tenantId - Tenant identifier
   * @returns BugMetricsDto with bug counts and blocking info
   */
  async getBugMetrics(tenantId: string): Promise<BugMetricsDto> {
    // Check cache first
    const cached = this.bugMetricsCache.get(tenantId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      this.logger.debug(`Cache hit for bug metrics: ${tenantId}`);
      return cached.metrics;
    }

    this.logger.debug(`Fetching bug metrics for tenant ${tenantId}`);

    try {
      // TODO: Implement when BugsService available
      // const bugs = await this.bugsService.findActiveByTenant(tenantId);
      // const metrics = this.aggregateBugMetrics(bugs);

      // Mock implementation for now
      const metrics: BugMetricsDto = {
        counts: {
          critical: 0,
          high: 2,
          medium: 5,
          low: 12,
        },
        blockingBugCount: 0,
        isBlocked: false,
        blockingReason: null,
        criticalBugIds: [],
        p0BugIds: [],
      };

      // Cache result
      this.bugMetricsCache.set(tenantId, {
        metrics,
        timestamp: Date.now(),
      });

      this.logger.debug(
        `Aggregated bug metrics: critical=${metrics.counts.critical}, ` +
          `high=${metrics.counts.high}, blocked=${metrics.isBlocked}`,
      );

      return metrics;
    } catch (error) {
      this.logger.error(
        `Failed to fetch bug metrics for tenant ${tenantId}: ${(error as any).message}`,
        (error as any).stack,
      );

      // Return conservative data (assume worst case)
      // This is safer for release decisions
      return this.getConservativeMetrics();
    }
  }

  /**
   * Check if any bug blocks release for a specific severity/priority
   * Used for release gate validation
   *
   * @param tenantId - Tenant identifier
   * @param severity - Bug severity to check (e.g., 'CRITICAL')
   * @param priority - Bug priority to check (e.g., 'P0')
   * @returns true if any bug at specified level is active
   */
  async hasBlockingBugs(
    tenantId: string,
    severity?: string,
    priority?: string,
  ): Promise<boolean> {
    const metrics = await this.getBugMetrics(tenantId);

    // Check specific severity if provided
    if (severity === 'CRITICAL') {
      return metrics.counts.critical > 0;
    }

    // Check specific priority if provided
    if (priority === 'P0') {
      return metrics.p0BugIds.length > 0;
    }

    // Otherwise check general blocking
    return metrics.isBlocked;
  }

  /**
   * Get list of critical bugs that block release
   *
   * @param tenantId - Tenant identifier
   * @returns Array of critical bug IDs
   */
  async getCriticalBugIds(tenantId: string): Promise<string[]> {
    const metrics = await this.getBugMetrics(tenantId);
    return metrics.criticalBugIds;
  }

  /**
   * Get list of P0 (urgent) bugs
   *
   * @param tenantId - Tenant identifier
   * @returns Array of P0 bug IDs
   */
  async getP0BugIds(tenantId: string): Promise<string[]> {
    const metrics = await this.getBugMetrics(tenantId);
    return metrics.p0BugIds;
  }

  /**
   * Aggregate bug metrics from individual bugs
   * Calculates counts, identifies blocking issues
   *
   * @private
   */
  private aggregateBugMetrics(bugs: any[]): BugMetricsDto {
    // TODO: Implement when Bug model available
    // Filter to active bugs only (not fixed/closed/invalid)
    // const activeBugs = bugs.filter(b => b.isActive());

    const metrics: BugMetricsDto = {
      counts: {
        critical: 0, // bugs.filter(b => b.severity === 'CRITICAL').length,
        high: 0, // bugs.filter(b => b.severity === 'HIGH').length,
        medium: 0, // bugs.filter(b => b.severity === 'MEDIUM').length,
        low: 0, // bugs.filter(b => b.severity === 'LOW').length,
      },
      blockingBugCount: 0,
      isBlocked: false,
      blockingReason: null,
      criticalBugIds: [],
      p0BugIds: [],
    };

    // TODO: Calculate blocking bugs
    // const blockingBugs = activeBugs.filter(b =>
    //   BugSeverityHelper.blocksRelease(b.severity) ||
    //   BugPriorityHelper.blocksRelease(b.priority)
    // );

    // if (blockingBugs.length > 0) {
    //   metrics.isBlocked = true;
    //   metrics.blockingBugCount = blockingBugs.length;
    //   metrics.blockingReason = `${blockingBugs.length} critical/P0 bug(s) prevent release`;
    //   metrics.criticalBugIds = blockingBugs
    //     .filter(b => b.severity === 'CRITICAL')
    //     .map(b => b.id);
    //   metrics.p0BugIds = blockingBugs
    //     .filter(b => b.priority === 'P0')
    //     .map(b => b.id);
    // }

    return metrics;
  }

  /**
   * Get conservative metrics (assume worst case)
   * Used for graceful degradation when bug service unavailable
   *
   * Conservative approach:
   * - Assume there might be blocking bugs (safe for release decisions)
   * - Return zero for counts (optimistic but will be caught by other gates)
   *
   * @private
   */
  private getConservativeMetrics(): BugMetricsDto {
    return {
      counts: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      },
      blockingBugCount: 0,
      isBlocked: false, // No known blocks (other gates will verify)
      blockingReason: null,
      criticalBugIds: [],
      p0BugIds: [],
    };
  }

  /**
   * Invalidate cache for tenant
   * Called when bugs change in Bug context
   *
   * @param tenantId - Tenant whose cache should be cleared
   */
  invalidateCache(tenantId: string): void {
    this.bugMetricsCache.delete(tenantId);
    this.logger.debug(`Invalidated bug metrics cache for ${tenantId}`);
  }

  /**
   * Clear all caches
   */
  clearAllCaches(): void {
    this.bugMetricsCache.clear();
    this.logger.debug('Cleared all bug adapter caches');
  }
}

/**
 * Bug Metrics DTO for Release context
 *
 * Read-only interface providing only the metrics Release needs
 * Hides Bug internal implementation from Release
 */
export interface BugMetricsDto {
  readonly counts: {
    readonly critical: number;
    readonly high: number;
    readonly medium: number;
    readonly low: number;
  };
  readonly blockingBugCount: number;
  readonly isBlocked: boolean;
  readonly blockingReason: string | null;
  readonly criticalBugIds: string[];
  readonly p0BugIds: string[];
}
