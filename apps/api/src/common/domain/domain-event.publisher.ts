import { Injectable, Logger } from '@nestjs/common';
import { DomainEvent } from './aggregate-root.interface';

/**
 * Interface for subscribing to domain events.
 *
 * Handlers implement this interface to react to domain events.
 * Example: Email notifications when requirement is approved, metrics updates on task completion.
 */
export interface DomainEventSubscriber<T extends DomainEvent = DomainEvent> {
  /**
   * Called when an event this subscriber is interested in occurs.
   *
   * @param event The domain event that occurred
   * @returns Promise that resolves when handling is complete
   */
  handle(event: T): Promise<void>;

  /**
   * Check if this subscriber is interested in the given event.
   *
   * @param event The domain event to check
   * @returns true if this subscriber should handle the event
   */
  isSubscribedTo(event: DomainEvent): boolean;
}

/**
 * Domain Event Publisher - Central event bus for publishing domain events.
 *
 * This service is responsible for:
 * - Publishing domain events from aggregates
 * - Managing subscriber subscriptions
 * - Routing events to interested subscribers
 * - Handling async event processing
 *
 * Usage:
 * ```typescript
 * // In your service:
 * const requirement = new RequirementAggregate(...);
 * requirement.approve(); // Adds RequirementApproved event
 *
 * // Save aggregate and publish events
 * await this.repo.save(requirement);
 * await this.eventPublisher.publishAll(requirement.getDomainEvents());
 * ```
 *
 * Event Handlers:
 * ```typescript
 * @Injectable()
 * export class SendRequirementApprovedEmailHandler implements DomainEventSubscriber {
 *   async handle(event: RequirementApproved) {
 *     // Send email notification
 *   }
 *
 *   isSubscribedTo(event: DomainEvent): boolean {
 *     return event.eventType === 'RequirementApproved';
 *   }
 * }
 * ```
 */
@Injectable()
export class DomainEventPublisher {
  private readonly logger = new Logger(DomainEventPublisher.name);
  private subscribers: Set<DomainEventSubscriber> = new Set();

  /**
   * Register a subscriber to receive domain events.
   *
   * @param subscriber The event subscriber to register
   */
  subscribe(subscriber: DomainEventSubscriber): void {
    this.subscribers.add(subscriber);
    this.logger.debug(
      `Subscriber registered: ${subscriber.constructor.name}`,
    );
  }

  /**
   * Unregister a subscriber.
   *
   * @param subscriber The event subscriber to unregister
   */
  unsubscribe(subscriber: DomainEventSubscriber): void {
    this.subscribers.delete(subscriber);
  }

  /**
   * Publish a single domain event to all interested subscribers.
   *
   * Events are processed asynchronously but errors are logged.
   * One subscriber failing does not prevent other subscribers from handling the event.
   *
   * @param event The domain event to publish
   * @throws Does not throw - errors are logged to prevent cascade failures
   */
  async publish(event: DomainEvent): Promise<void> {
    this.logger.debug(
      `Publishing event: ${event.eventType} [${event.eventId}] for aggregate ${event.aggregateId}`,
    );

    const interestedSubscribers = Array.from(this.subscribers).filter(
      (subscriber) => subscriber.isSubscribedTo(event),
    );

    if (interestedSubscribers.length === 0) {
      this.logger.warn(
        `No subscribers for event: ${event.eventType} [${event.eventId}]`,
      );
      return;
    }

    // Process all subscribers, catching errors to prevent cascade failures
    const results = await Promise.allSettled(
      interestedSubscribers.map((subscriber) => subscriber.handle(event)),
    );

    // Log results
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        this.logger.error(
          `Error in subscriber ${interestedSubscribers[index].constructor.name} ` +
            `handling event ${event.eventType}: ${result.reason}`,
          result.reason.stack,
        );
      }
    });
  }

  /**
   * Publish multiple domain events.
   *
   * All events are published sequentially to maintain order.
   * Errors in one subscriber don't prevent others from being called.
   *
   * @param events Array of domain events to publish
   * @throws Does not throw - errors are logged
   */
  async publishAll(events: DomainEvent[]): Promise<void> {
    this.logger.debug(`Publishing ${events.length} events`);

    for (const event of events) {
      await this.publish(event);
    }

    this.logger.debug(`Finished publishing ${events.length} events`);
  }

  /**
   * Get the number of registered subscribers.
   * Useful for testing and debugging.
   */
  getSubscriberCount(): number {
    return this.subscribers.size;
  }

  /**
   * Get the number of subscribers for a specific event type.
   * Useful for testing and debugging.
   */
  getSubscriberCountForEvent(eventType: string): number {
    return Array.from(this.subscribers).filter((subscriber) => {
      const dummyEvent: DomainEvent = {
        eventId: 'test',
        eventType,
        aggregateId: 'test',
        aggregateType: 'test',
        tenantId: 'test',
        occurredAt: new Date(),
      };
      return subscriber.isSubscribedTo(dummyEvent);
    }).length;
  }
}
