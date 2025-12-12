import { Injectable, Logger } from '@nestjs/common';
import { DomainEventPublisher, DomainEventSubscriber } from '../domain-event.publisher';
import { DomainEvent } from '../aggregate-root.interface';
import { ReleaseReadinessEvaluated } from '../../../releases/domain/events/release-readiness-evaluated.event';

/**
 * ReleaseReadinessEvaluated Event Subscriber
 *
 * Workflow: When release readiness is evaluated, update analytics and alert stakeholders
 *
 * This subscriber coordinates:
 * - Releases context: RCS calculated
 * - Analytics context: Store RCS history
 * - Notification context: Alert if blocked
 * - Dashboard context: Update release status
 * - Compliance context: Track release metrics
 *
 * Critical Event: This is key decision point for deployment pipeline
 *
 * SLA: Process within 200ms
 * Retry: 3 attempts (metrics are non-blocking)
 * Error Handling: Always log, graceful degradation
 *
 * Business Impact: Very High - determines if release proceeds
 */
@Injectable()
export class ReleaseReadinessEvaluatedSubscriber implements DomainEventSubscriber {
  private readonly logger = new Logger(ReleaseReadinessEvaluatedSubscriber.name);

  constructor(private eventPublisher: DomainEventPublisher) {
    // Subscribe to ReleaseReadinessEvaluated events
    this.eventPublisher.subscribe(this);
  }

  isSubscribedTo(event: DomainEvent): boolean {
    return event.eventType === 'ReleaseReadinessEvaluated';
  }

  /**
   * Handle ReleaseReadinessEvaluated event
   *
   * Process:
   * 1. Store RCS evaluation in analytics/audit trail
   * 2. Update release dashboard with current status
   * 3. If blocked, send urgent notification to stakeholders
   * 4. If ready, enable deployment approval workflows
   * 5. Record metrics for compliance and reporting
   * 6. Trigger downstream workflows based on status
   *
   * @param event ReleaseReadinessEvaluated event
   */
  async handle(event: DomainEvent): Promise<void> {
    const releaseEvent = event as ReleaseReadinessEvaluated;
    try {
      this.logger.debug(
        `Processing ReleaseReadinessEvaluated event for ${releaseEvent.releaseId}`,
      );

      // Store RCS evaluation in audit trail
      // TODO: Implement when Release service available
      // await this.releaseAuditService.recordEvaluation({
      //   releaseId: releaseEvent.releaseId,
      //   score: releaseEvent.score,
      //   status: releaseEvent.status,
      //   timestamp: releaseEvent.occurredAt,
      // });

      // Update release metrics
      // await this.releaseMetricsService.updateRCS({
      //   releaseId: releaseEvent.releaseId,
      //   score: releaseEvent.score,
      //   status: releaseEvent.status,
      //   passesAllGates: releaseEvent.passesAllGates,
      // });

      // Handle based on status
      if (releaseEvent.status === 'READY' && releaseEvent.passesAllGates) {
        await this.handleReadyForRelease(releaseEvent);
      } else if (releaseEvent.status === 'BLOCKED') {
        await this.handleBlocked(releaseEvent);
      } else if (releaseEvent.status === 'WARNING') {
        await this.handleWarning(releaseEvent);
      }

      this.logger.log(
        `Release ${releaseEvent.releaseId} evaluated: RCS ${releaseEvent.score}/100 - ${releaseEvent.status}`,
      );
    } catch (error) {
      // Error handling: log but don't block release evaluation
      this.logger.error(
        `Failed to process release readiness for ${releaseEvent.releaseId}: ${(error as any).message}`,
        (error as any).stack,
      );
    }
  }

  /**
   * Handle READY status: release is ready for approval
   * @private
   */
  private async handleReadyForRelease(
    event: ReleaseReadinessEvaluated,
  ): Promise<void> {
    this.logger.debug(
      `Release ${event.releaseId} is READY for deployment (RCS: ${event.score})`,
    );

    // TODO: Implement when Release service available
    // - Notify release manager for final approval
    // - Enable deployment button in dashboard
    // - Create deployment request
    // - Update CI/CD pipeline status
  }

  /**
   * Handle BLOCKED status: critical issues detected
   * @private
   */
  private async handleBlocked(
    event: ReleaseReadinessEvaluated,
  ): Promise<void> {
    this.logger.warn(
      `Release ${event.releaseId} is BLOCKED (RCS: ${event.score}) - immediate action required`,
    );

    // TODO: Implement when Notification service available
    // - Send urgent email to stakeholders
    // - Create slack/teams alert (high priority channel)
    // - Create incident ticket if critical
    // - Update release status on all dashboards
    // - Send SMS for critical blocking (if configured)
  }

  /**
   * Handle WARNING status: some gates at risk but not blocking
   * @private
   */
  private async handleWarning(
    event: ReleaseReadinessEvaluated,
  ): Promise<void> {
    this.logger.warn(
      `Release ${event.releaseId} has WARNING status (RCS: ${event.score})`,
    );

    // TODO: Implement when Notification service available
    // - Send warning email to release team
    // - Add dashboard notification
    // - Request review of identified issues
  }

  /**
   * Store evaluation for compliance and audit trail
   * @private
   */
  private async storeEvaluationAudit(event: ReleaseReadinessEvaluated): Promise<void> {
    // TODO: Implement compliance audit trail
    // This is required for SOC2, ISO27001, etc.
  }
}
