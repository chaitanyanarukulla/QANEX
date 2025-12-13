import { Injectable, Logger } from '@nestjs/common';
import {
  DomainEventPublisher,
  DomainEventSubscriber,
} from '../domain-event.publisher';
import { DomainEvent } from '../aggregate-root.interface';
import { BugTriaged } from '../../../bugs/domain/events/bug-triaged.event';

/**
 * BugTriaged Event Subscriber
 *
 * Workflow: When a bug is triaged (severity/priority assigned), update release readiness
 * and assign to developer
 *
 * This subscriber coordinates:
 * - Bugs context: Bug triaged with severity/priority
 * - Releases context: Re-evaluate RCS if critical/P0
 * - Sprint context: Add to sprint backlog if assigned
 * - Notification context: Notify assigned developer
 * - Metrics context: Update bug severity distribution
 *
 * Business Impact: Medium-High
 * - Critical/P0 bugs can block releases
 * - Should trigger immediate developer assignment
 *
 * SLA: Process within 300ms
 * Retry: 3 attempts
 * Error Handling: Log and continue (triage shouldn't be blocked)
 */
@Injectable()
export class BugTriagedSubscriber implements DomainEventSubscriber {
  private readonly logger = new Logger(BugTriagedSubscriber.name);

  constructor(private eventPublisher: DomainEventPublisher) {
    // Subscribe to BugTriaged events
    this.eventPublisher.subscribe(this);
  }

  isSubscribedTo(_event: DomainEvent): boolean {
    return _event.eventType === 'BugTriaged';
  }

  /**
   * Handle BugTriaged event
   *
   * Process:
   * 1. Check if bug is critical or P0
   * 2. If critical/P0, trigger release readiness re-evaluation
   * 3. Assign to developer (if provided)
   * 4. Add to sprint backlog
   * 5. Send notifications based on priority
   * 6. Update bug metrics/dashboard
   *
   * @param event BugTriaged event
   */
  async handle(_event: DomainEvent): Promise<void> {
    const bugEvent = _event as BugTriaged;
    try {
      this.logger.debug(
        `Processing BugTriaged event for bug ${bugEvent.bugId}`,
      );

      // TODO: Implement when Bug service available
      // const bug = await this.bugsService.findById(bugEvent.bugId);

      // Handle critical/P0 bugs specially
      const isCritical = bugEvent.severity === 'CRITICAL';
      const isP0 = bugEvent.priority === 'P0';

      if (isCritical || isP0) {
        await this.handleCriticalBug(bugEvent);
      }

      // Assign to developer
      if (bugEvent.assignedTo) {
        await this.assignBugToDeveloper(bugEvent);
      }

      // Add to sprint backlog if in active sprint
      // await this.addBugToSprintBacklog(bugEvent);

      // Send notifications
      await this.sendTriageNotifications(bugEvent);

      // Update metrics
      // await this.bugMetricsService.updateTriageMetrics(bugEvent);

      this.logger.log(
        `Bug ${bugEvent.bugId} triaged: severity=${bugEvent.severity}, priority=${bugEvent.priority}`,
      );
    } catch (error) {
      // Error handling: log but don't block triage
      this.logger.error(
        `Failed to process bug triage for ${bugEvent.bugId}: ${(error as any).message}`,
        (error as any).stack,
      );
    }
  }

  /**
   * Handle critical or P0 bugs
   * These may block releases, so need immediate attention
   *
   * @private
   */
  private async handleCriticalBug(_event: BugTriaged): Promise<void> {
    this.logger.warn(
      `CRITICAL BUG TRIAGED: ${_event.bugId} - severity=${_event.severity}, priority=${_event.priority}`,
    );

    // TODO: Implement when Release service available
    // - Get active/upcoming releases
    // - For each release, trigger readiness re-evaluation
    // - Check if this bug would block release
    // - If would block, notify release manager immediately

    // TODO: Implement escalation
    // - Send urgent notification to bug owner's manager
    // - Create high-priority dashboard alert
    // - Send slack alert to #bugs channel
  }

  /**
   * Assign bug to developer and notify them
   * @private
   */
  private async assignBugToDeveloper(_event: BugTriaged): Promise<void> {
    // TODO: Implement when Notification service available
    // - Send assignment notification to developer
    // - Add to developer's task queue
    // - Create calendar blocking for estimated fix time
    // - Calculate SLA deadline based on priority
  }

  /**
   * Send triage notifications to team
   * @private
   */
  private async sendTriageNotifications(_event: BugTriaged): Promise<void> {
    // TODO: Implement notifications
    // Level 1 (Critical/P0): Email + Slack + SMS
    // Level 2 (High/P1): Email + Slack
    // Level 3 (Medium/P2): Email + Dashboard
    // Level 4 (Low/P3): Dashboard only
  }

  /**
   * Add bug to sprint backlog if in active sprint
   * @private
   */
  private async addBugToSprintBacklog(_event: BugTriaged): Promise<void> {
    // TODO: Implement when Sprint service available
    // - Find active sprint
    // - Create bug story in sprint
    // - Link to original bug record
    // - Update sprint metrics
  }
}
