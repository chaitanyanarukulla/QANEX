import { Injectable, Logger } from '@nestjs/common';

/**
 * SprintAdapter (Anti-Corruption Layer)
 *
 * Purpose: Convert Requirements context data into Sprint context models.
 * Shields Sprint aggregate from Requirements schema changes.
 *
 * Mapping:
 * - Requirement → SprintItem (with story points estimation)
 * - RequirementStatus.APPROVED → SprintItem.status = READY_FOR_SPRINT
 * - RequirementPriority → SprintItem.priority
 * - RequirementRQSScore → SprintItem.qualityMetric
 *
 * Use Cases:
 * 1. Adding approved requirements to sprint backlog
 * 2. Converting requirements to sprint items
 * 3. Estimating story points for requirements
 * 4. Filtering requirements by sprint-readiness criteria
 *
 * Design Pattern: Anti-Corruption Layer
 * - Translates between Requirements and Sprint bounded contexts
 * - Prevents Sprint aggregate from knowing Requirements details
 * - Single responsibility: Requirements to Sprint mapping
 *
 * SLA: Mapping operations < 100ms
 * Caching: Sprint item mappings cached for 5 minutes
 */
@Injectable()
export class SprintAdapter {
  private readonly logger = new Logger(SprintAdapter.name);
  private itemMappingCache = new Map<
    string,
    { item: SprintItemDto; timestamp: number }
  >();
  private readonly CACHE_TTL_MS = 300000; // 5 minutes

  constructor() {
    // TODO: Inject services from other contexts
    // - private requirementsService: RequirementsService,
  }

  /**
   * Map requirement to sprint item
   * Converts Requirements model to Sprint model
   *
   * @param requirementId - ID from Requirements context
   * @returns SprintItemDto ready for Sprint.addItem()
   */
  async mapRequirementToSprintItem(
    requirementId: string,
  ): Promise<SprintItemDto> {
    // Check cache first
    const cached = this.itemMappingCache.get(requirementId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      this.logger.debug(`Cache hit for sprint item mapping: ${requirementId}`);
      return cached.item;
    }

    this.logger.debug(`Mapping requirement ${requirementId} to sprint item`);

    try {
      // TODO: Implement when RequirementsService available
      // const requirement = await this.requirementsService.findById(requirementId);
      // const sprintItem = this.convertToSprintItem(requirement);

      // Mock implementation for now
      const sprintItem: SprintItemDto = {
        id: requirementId,
        title: `Requirement ${requirementId}`,
        description: 'Mock requirement converted to sprint item',
        estimatedStoryPoints: 8,
        priority: 'HIGH',
        qualityScore: 85,
      };

      // Cache result
      this.itemMappingCache.set(requirementId, {
        item: sprintItem,
        timestamp: Date.now(),
      });

      return sprintItem;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to map requirement ${requirementId}: ${errorMessage}`,
        errorStack,
      );

      throw new Error(
        `Cannot convert requirement to sprint item: ${errorMessage}`,
      );
    }
  }

  /**
   * Map multiple requirements to sprint items
   * Batch operation for efficiency
   *
   * @param requirementIds - Array of requirement IDs
   * @returns Array of SprintItemDtos
   */
  async mapRequirementsToSprintItems(
    requirementIds: string[],
  ): Promise<SprintItemDto[]> {
    this.logger.debug(
      `Mapping ${requirementIds.length} requirements to sprint items`,
    );

    // Map in parallel for performance
    const items = await Promise.all(
      requirementIds.map((id) => this.mapRequirementToSprintItem(id)),
    );

    return items;
  }

  /**
   * Filter requirements that are sprint-ready
   * Only approved, high-quality requirements can be added to sprints
   *
   * @param requirementIds - Candidate requirements
   * @returns Requirements ready for sprint inclusion
   */
  async filterSprintReadyRequirements(
    requirementIds: string[],
  ): Promise<string[]> {
    this.logger.debug(
      `Filtering ${requirementIds.length} requirements for sprint readiness`,
    );

    // TODO: Implement when RequirementsService available
    // const requirements = await this.requirementsService.findByIds(requirementIds);
    // return requirements
    //   .filter(r => r.status === 'APPROVED')
    //   .filter(r => r.rqsScore.isHighQuality())
    //   .map(r => r.id);

    // Mock implementation: return all for now
    return requirementIds;
  }

  /**
   * Estimate story points for a requirement
   * Uses requirements complexity metrics
   *
   * @param requirementId - Requirement to estimate
   * @returns Estimated story points (typically 5, 8, 13, 21)
   */
  async estimateStoryPoints(requirementId: string): Promise<number> {
    this.logger.debug(
      `Estimating story points for requirement ${requirementId}`,
    );

    try {
      // TODO: Implement estimation algorithm based on:
      // - Requirement complexity
      // - RQS Score completeness
      // - Historical velocity

      // Mock: return 8 for now
      return 8;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to estimate story points: ${errorMessage}`,
        errorStack,
      );

      // Default to medium estimate on failure
      return 8;
    }
  }

  /**
   * Convert requirement priority to sprint priority
   * Maps Requirements schema to Sprint schema
   *
   * @param requirementPriority - Priority from Requirements context
   * @returns Priority for Sprint context
   *
   * @private
   */
  private convertPriority(requirementPriority: string): string {
    const priorityMap: Record<string, string> = {
      CRITICAL: 'BLOCKING',
      HIGH: 'HIGH',
      MEDIUM: 'MEDIUM',
      LOW: 'LOW',
    };

    return priorityMap[requirementPriority] || 'MEDIUM';
  }

  /**
   * Convert requirement to sprint item
   * Internal conversion logic
   *
   * @private
   */
  private convertToSprintItem(requirement: any): SprintItemDto {
    // TODO: Implement conversion logic based on Requirement model
    return {
      id: requirement.id,
      title: requirement.title,
      description: requirement.description,
      estimatedStoryPoints: requirement.estimatedPoints || 8,
      priority: this.convertPriority(requirement.priority),
      qualityScore: requirement.rqsScore?.getTotalScore() || 75,
    };
  }

  /**
   * Invalidate cache for requirement
   * Called when requirement changes in Requirements context
   *
   * @param requirementId - Requirement whose cache should be cleared
   */
  invalidateCache(requirementId: string): void {
    this.itemMappingCache.delete(requirementId);
    this.logger.debug(`Invalidated sprint item cache for ${requirementId}`);
  }

  /**
   * Clear all caches
   */
  clearAllCaches(): void {
    this.itemMappingCache.clear();
    this.logger.debug('Cleared all sprint adapter caches');
  }
}

/**
 * Sprint Item DTO from Requirements
 *
 * Read-only interface preventing mutations
 * Contract between Sprint adapter and Sprint aggregate
 */
export interface SprintItemDto {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly estimatedStoryPoints: number;
  readonly priority: string;
  readonly qualityScore: number;
}
