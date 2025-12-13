import { Injectable, Logger } from '@nestjs/common';
import {
  DomainEventPublisher,
  DomainEventSubscriber,
} from '../domain-event.publisher';
import { DomainEvent } from '../aggregate-root.interface';
import { BugResolved } from '../../../bugs/domain/events/bug-resolved.event';

/**
 * BugResolved Event Subscriber
 *
 * Workflow: When a bug is resolved, update release readiness metrics
 * and move to QA verification
 *
 * This subscriber coordinates:
 * - Bugs context: Bug marked as resolved
 * - Releases context: Re-calculate RCS if critical/P0 bug
 * - QA context: Create verification task
 * - Metrics context: Track resolution time
 * - Notification context: Notify QA team
 *
 * Impact: Medium
 * - Critical/P0 bugs can un-block releases when fixed
 * - Should trigger QA verification workflow
 * - Affects release timeline
 *
 * SLA: Process within 200ms
 * Retry: 3 attempts
 * Error Handling: Log and continue (doesn't block bug resolution)
 */
@Injectable()
export class BugResolvedSubscriber implements DomainEventSubscriber {
  private readonly logger = new Logger(BugResolvedSubscriber.name);

  constructor(private eventPublisher: DomainEventPublisher) {
    // Subscribe to BugResolved events
    this.eventPublisher.subscribe(this);
  }

  isSubscribedTo(event: DomainEvent): boolean {
    return event.eventType === 'BugResolved';
  }

  /**
   * Handle BugResolved event
   *
   * Process:
   * 1. If critical/P0 bug, check if it was blocking any releases
   * 2. If was blocking, trigger release readiness re-evaluation
   * 3. Create QA verification task
   * 4. Update bug metrics (resolution time, etc.)
   * 5. Notify QA team to verify fix
   * 6. Calculate SLA metrics
   *
   * @param event BugResolved event
   */
  async handle(event: DomainEvent): Promise<void> {
    const bugEvent = event as BugResolved;
    try {
      this.logger.debug(
        `Processing BugResolved event for bug ${bugEvent.bugId}`,
      );

      // Handle critical/P0 bugs that might un-block releases
      const isCritical = bugEvent.severity === 'CRITICAL';
      const isP0 = bugEvent.priority === 'P0';

      if (isCritical || isP0) {
        await this.handleCriticalBugResolved(bugEvent);
      }

      // Create QA verification task
      // TODO: Implement when QA/Sprint service available
      // await this.qaService.createVerificationTask({
      //   bugId: event.bugId,
      //   resolutionNotes: event.resolutionNotes,
      //   developerId: event.userId,
      // });

      // Update bug metrics
      // TODO: Implement when Analytics service available
      // await this.analyticsService.recordBugResolution({
      //   bugId: event.bugId,
      //   severity: event.severity,
      //   priority: event.priority,
      //   resolutionTime: calculateResolutionTime(),
      // });

      // Send notifications
      await this.sendResolutionNotifications(bugEvent);

      this.logger.log(
        `Bug ${bugEvent.bugId} resolved - awaiting QA verification`,
      );
    } catch (error) {
      // Error handling: log but don't block bug resolution
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to process bug resolution for ${bugEvent.bugId}: ${errorMessage}`,
        errorStack,
      );
    }
  }

  /**
   * Handle critical or P0 bug resolution
   * These may have been blocking releases, so might un-block them
   *
   * @private
   */
  private async handleCriticalBugResolved(event: BugResolved): Promise<void> {
    this.logger.debug(
      `CRITICAL BUG RESOLVED: ${event.bugId} - Re-evaluating release readiness`,
    );

    // TODO: Implement when Release service available
    // - Find releases that were blocked by this bug
    // - Trigger readiness re-evaluation
    // - If now passes gates, notify release manager
    // - Check if deployment can proceed
  }

  /**
   * Create QA verification workflow
   * QA needs to verify the fix actually resolves the issue
   *
   * @private
   */
  private async createQAVerificationWorkflow(
    event: BugResolved,
  ): Promise<void> {
    // TODO: Implement when QA/Sprint service available
    // - Create QA task in sprint
    // - Link to bug fix PR/commit
    // - Provide reproduction steps if available
    // - Set verification deadline
  }

  /**
   * Calculate resolution time metrics
   * Used for SLA tracking and process improvements
   *
   * @private
   */
  private async calculateResolutionMetrics(_event: BugResolved): Promise<{
    resolutionTime: number;
    slaMetricHours: number;
    meetsTargetTime: boolean;
  }> {
    // TODO: Implement metrics calculation
    // - Calculate time from bug creation to resolution
    // - Compare against SLA for bug priority
    // - Identify if SLA was met
    // - Use for performance tracking

    return {
      resolutionTime: 0,
      slaMetricHours: 0,
      meetsTargetTime: true,
    };
  }

  /**
   * Send resolution notifications to QA and stakeholders
   * @private
   */
  private async sendResolutionNotifications(
    _event: BugResolved,
  ): Promise<void> {
    // TODO: Implement notifications
    // - QA lead: Bug ready for verification with resolution notes
    // - Bug reporter: Status update on bug fix
    // - If critical: Release manager: Notify of critical bug resolution
    // - Dashboard: Update bug status
  }

  /**
   * Update bug resolution time SLA tracking
   * @private
   */
  private async updateSLAMetrics(_event: BugResolved): Promise<void> {
    // TODO: Implement SLA tracking
    // - Priority P0: Should be resolved within 1 day
    // - Priority P1: Within 3 days
    // - Priority P2: Within 7 days
    // - Priority P3: Within 30 days
    // - Track if SLA met for reporting
  }
}
