import { DomainEvent } from './aggregate-root.interface';

/**
 * Interface for domain event subscribers
 *
 * Subscribers handle domain events published by aggregates and trigger
 * cross-context workflows, notifications, and side effects.
 *
 * Implementations:
 * - RequirementApprovedSubscriber: Generates tasks, notifies stakeholders
 * - SprintStartedSubscriber: Initializes tracking, sends notifications
 * - ReleaseReadinessAchievedSubscriber: Enables deployment workflow
 * - BugResolvedSubscriber: Updates metrics dashboards
 * - TestRunCompletedSubscriber: Generates reports
 *
 * Key Principles:
 * 1. Subscribers are independent - one subscriber failure doesn't block others
 * 2. Subscribers are idempotent - same event processed twice yields same result
 * 3. Subscribers are async - don't block aggregate operations
 * 4. Subscribers have SLAs - defined maximum execution time
 * 5. Subscribers log comprehensively for debugging
 */
export interface DomainEventSubscriber {
  /**
   * Check if this subscriber is interested in a given event
   *
   * @param event The domain event to check
   * @returns true if subscriber should handle this event
   */
  isSubscribedTo(event: DomainEvent): boolean;

  /**
   * Handle a domain event
   *
   * Should:
   * - Be idempotent (safe to call multiple times)
   * - Complete within SLA (typically 100ms - 1s)
   * - Log errors but not throw (partial success acceptable)
   * - Not block other subscribers
   *
   * @param event The domain event to handle
   * @throws Should generally NOT throw; log error instead
   */
  handle(event: DomainEvent): Promise<void>;
}
