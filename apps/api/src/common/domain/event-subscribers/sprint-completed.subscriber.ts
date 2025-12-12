import { Injectable, Logger } from '@nestjs/common';
import { DomainEventPublisher } from '../domain-event.publisher';
import { SprintCompleted } from '../../../sprints/domain/events/sprint-completed.event';

/**
 * SprintCompleted Event Subscriber
 *
 * Workflow: When a sprint completes, calculate velocity, update metrics, and trigger retrospective
 *
 * This subscriber coordinates:
 * - Sprints context: Sprint completed with metrics
 * - Analytics context: Store velocity and sprint metrics
 * - Projects context: Update project roadmap
 * - Team context: Generate sprint retrospective data
 * - Dashboard context: Update team velocity charts
 *
 * Business Impact: High
 * - Velocity is key metric for planning and forecasting
 * - Used to predict project completion
 * - Input for capacity planning
 *
 * SLA: Process within 1000ms (includes report generation)
 * Retry: 3 attempts (metrics are non-blocking)
 * Error Handling: Graceful degradation
 */
@Injectable()
export class SprintCompletedSubscriber {
  private readonly logger = new Logger(SprintCompletedSubscriber.name);

  constructor(private eventPublisher: DomainEventPublisher) {
    // Subscribe to SprintCompleted events
    this.eventPublisher.subscribe('SprintCompleted', this.handle.bind(this));
  }

  /**
   * Handle SprintCompleted event
   *
   * Process:
   * 1. Calculate sprint velocity
   * 2. Store sprint metrics in analytics
   * 3. Update project roadmap with completed work
   * 4. Archive sprint data
   * 5. Generate sprint retrospective report
   * 6. Update team velocity trend
   * 7. Predict future sprint capacity
   * 8. Send completion notifications
   *
   * @param event SprintCompleted event
   */
  async handle(event: SprintCompleted): Promise<void> {
    try {
      this.logger.debug(
        `Processing SprintCompleted event for sprint ${event.sprintId}`,
      );

      // Calculate sprint velocity
      const velocity = this.calculateVelocity(event);

      // TODO: Implement when Analytics service available
      // await this.analyticsService.recordSprintMetrics({
      //   sprintId: event.sprintId,
      //   velocity,
      //   totalItems: event.totalItems,
      //   completedItems: event.completedItems,
      //   totalStoryPoints: event.totalStoryPoints,
      //   completedStoryPoints: event.completedStoryPoints,
      //   completionPercentage: event.completionPercentage,
      // });

      // Update project roadmap
      // TODO: Implement when Projects service available
      // await this.projectService.updateRoadmapWithCompletedSprint({
      //   sprintId: event.sprintId,
      //   completedItems: event.completedItems,
      //   completedStoryPoints: event.completedStoryPoints,
      // });

      // Generate sprint report
      // TODO: Implement when Reports service available
      // const report = await this.reportService.generateSprintReport({
      //   sprintId: event.sprintId,
      //   metrics: { velocity, completionPercentage: event.completionPercentage },
      // });

      // Send notifications
      await this.sendCompletionNotifications(event, velocity);

      this.logger.log(
        `Sprint completed: velocity=${velocity}, completion=${event.completionPercentage}%`,
      );
    } catch (error) {
      // Error handling: log but don't block sprint completion
      this.logger.error(
        `Failed to process sprint completion for ${event.sprintId}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Calculate sprint velocity from completed story points
   * Velocity = completed story points in sprint
   *
   * This is used for future sprint planning and capacity forecasting
   *
   * @private
   */
  private calculateVelocity(event: SprintCompleted): number {
    // Velocity is the completed story points
    // Note: This is simplified; more sophisticated velocity might exclude bugs/tech debt
    return event.completedStoryPoints || 0;
  }

  /**
   * Update team velocity trend over time
   * Used for burndown predictions and project forecasting
   *
   * @private
   */
  private async updateVelocityTrend(
    sprintId: string,
    currentVelocity: number,
  ): Promise<void> {
    // TODO: Implement when Analytics service available
    // - Get last 5 sprint velocities
    // - Calculate trend (average, std deviation, trend line)
    // - Identify if velocity is stable/improving/declining
    // - Use for capacity planning in future sprints
  }

  /**
   * Generate sprint retrospective data
   * Helps team reflect on what went well/poorly
   *
   * @private
   */
  private async generateRetrospectiveData(
    event: SprintCompleted,
  ): Promise<void> {
    // TODO: Implement retrospective generation
    // - Identify high/low performers
    // - Track bug injection rate (bugs found in this sprint)
    // - Calculate rework percentage
    // - Identify scope changes
    // - Recommend improvements
  }

  /**
   * Predict next sprint capacity based on velocity
   * Helps with planning future sprints
   *
   * @private
   */
  private async predictNextSprintCapacity(velocity: number): Promise<number> {
    // TODO: Implement capacity prediction
    // - Use historical velocity data
    // - Account for team capacity changes
    // - Factor in known constraints
    // - Return recommended story point capacity for next sprint

    return velocity;
  }

  /**
   * Send sprint completion notifications
   * @private
   */
  private async sendCompletionNotifications(
    event: SprintCompleted,
    velocity: number,
  ): Promise<void> {
    // TODO: Implement notifications
    // - Scrum master: Sprint completion summary
    // - Product owner: Completed work summary
    // - Team: Celebrate completion, prepare for retrospective
    // - Dashboard: Visual update with velocity metrics
  }

  /**
   * Archive sprint data for historical analysis
   * @private
   */
  private async archiveSprintData(event: SprintCompleted): Promise<void> {
    // TODO: Implement sprint archival
    // - Move sprint to archive
    // - Snapshot all metrics
    // - Preserve for historical analysis
    // - Clean up in-progress data
  }
}
