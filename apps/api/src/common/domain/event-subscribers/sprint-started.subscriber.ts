import { Injectable, Logger } from '@nestjs/common';
import { DomainEventSubscriber } from '../domain-event-subscriber.interface';
import { DomainEvent } from '../aggregate-root.interface';
import { SprintStarted } from '../../../sprints/domain/events/sprint-started.event';

/**
 * SprintStarted Event Subscriber
 *
 * Workflow: When a sprint starts, notify team members and create tracking workflows:
 * - Send sprint kick-off notifications
 * - Initialize burndown chart
 * - Start velocity tracking
 * - Enable sprint-specific dashboards
 * - Create sprint status snapshots
 *
 * This subscriber coordinates:
 * - Sprints context: Sprint starts
 * - Notification context: Send emails/notifications
 * - Analytics context: Create burndown tracking
 * - Dashboard context: Initialize sprint views
 *
 * SLA: Process within 500ms (includes email queue time)
 * Retry: 5 attempts with exponential backoff (email reliability important)
 * Error Handling: Partial success is acceptable (don't block sprint start)
 *
 * Business Impact: High - team awareness of sprint start is critical
 */
@Injectable()
export class SprintStartedSubscriber implements DomainEventSubscriber {
  private readonly logger = new Logger(SprintStartedSubscriber.name);

  constructor() {}

  /**
   * Check if subscriber is interested in this event
   */
  isSubscribedTo(_event: DomainEvent): boolean {
    return (
      event instanceof SprintStarted || event.eventType === 'SprintStarted'
    );
  }

  /**
   * Handle SprintStarted event and trigger team notifications
   *
   * Process:
   * 1. Retrieve sprint and team details
   * 2. Calculate velocity baseline from historical data
   * 3. Initialize burndown tracking
   * 4. Send sprint kick-off email to team
   * 5. Create slack/teams announcement (if configured)
   * 6. Initialize sprint dashboard
   * 7. Create backlog snapshot for velocity calculations
   *
   * @param event SprintStarted event
   */
  async handle(_event: DomainEvent): Promise<void> {
    const sprintEvent = event as SprintStarted;
    try {
      this.logger.debug(
        `Processing SprintStarted event for sprint ${sprintEvent.aggregateId}`,
      );

      // TODO: Implement when Sprint service available
      // const sprint = await this.sprintsService.findById(sprintEvent.aggregateId);
      // const team = await this.teamsService.findByTenant(sprintEvent.tenantId);

      // Calculate velocity baseline
      // const previousVelocity = await this.metricsService.calculateVelocity(
      //   sprintEvent.aggregateId,
      //   sprintEvent.tenantId,
      // );

      // Initialize burndown tracking
      // await this.burndownService.initialize({
      //   sprintId: sprintEvent.aggregateId,
      //   totalStoryPoints: sprintEvent.totalStoryPoints,
      //   daysInSprint: sprint.daysInSprint,
      //   velocityBaseline: previousVelocity,
      // });

      // Send notifications
      // await this.notificationService.sendSprintStarted({
      //   sprintId: sprintEvent.aggregateId,
      //   teamId: team.id,
      //   itemCount: sprintEvent.itemCount,
      //   totalStoryPoints: sprintEvent.totalStoryPoints,
      // });

      // Create sprint dashboard snapshot
      // await this.dashboardService.createSprintView({
      //   sprintId: sprintEvent.aggregateId,
      //   tenantId: sprintEvent.tenantId,
      // });

      this.logger.log(
        `Sprint ${sprintEvent.sprintId} started. ` +
          `End date: ${sprintEvent.endDate.toISOString()}, Capacity: ${sprintEvent.capacity} story points`,
      );
    } catch (error) {
      // Error handling: log but don't block sprint operations
      this.logger.error(
        `Failed to process sprint start for ${sprintEvent.aggregateId}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );

      // TODO: Could publish SprintStartNotificationFailed event for alerting
    }
  }

  /**
   * Send sprint started notification to team
   * Supports multiple notification channels for flexibility
   *
   * @private
   */
  private async sendNotifications(_sprintData: any): Promise<void> {
    // TODO: Implement multi-channel notifications
    // - Email notification
    // - Slack/Teams webhook
    // - In-app notification
    // - SMS for critical sprints
  }

  /**
   * Calculate and store velocity baseline for sprint
   * Used for burndown accuracy and sprint health predictions
   *
   * @private
   */
  private async calculateVelocityBaseline(sprintId: string): Promise<number> {
    // TODO: Implement velocity calculation from historical data
    // This helps predict sprint outcomes early

    return 0;
  }
}
