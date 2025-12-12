import { Injectable, Logger } from '@nestjs/common';
import { DomainEventPublisher } from '../domain/domain-event.publisher';
import { EventStoreService } from './services/event-store.service';
import { DomainEvent } from '../domain/aggregate-root.interface';
import { EventMigrationHandler } from './handlers/event-migration.handler';

/**
 * EventStore Publisher - Bridges EventStore with DomainEventPublisher
 *
 * Purpose: Automatically persist domain events to the event store
 * while publishing them to subscribers.
 *
 * Workflow:
 * 1. Service publishes event via DomainEventPublisher
 * 2. EventStorePublisher intercepts and persists to EventStore
 * 3. Event is then published to all subscribers
 * 4. Subscribers handle business logic (emails, notifications, etc.)
 *
 * This ensures:
 * - All events are durably persisted (audit trail)
 * - Events are published to handlers (business workflows)
 * - Order is maintained (persist then publish)
 *
 * Architecture Decision: Persist then publish
 * - Ensures events aren't lost if publisher fails
 * - Subscribers see only successfully persisted events
 * - Trades latency for durability (acceptable for < 100ms append)
 *
 * Configuration:
 * ```typescript
 * // In app.module.ts
 * @Module({
 *   imports: [
 *     EventStoreModule,
 *     // ... other imports
 *   ],
 *   providers: [
 *     DomainEventPublisher,
 *     EventStorePublisher,
 *   ],
 * })
 * export class AppModule {}
 * ```
 *
 * Usage:
 * ```typescript
 * @Injectable()
 * export class RequirementsService {
 *   constructor(
 *     private eventStorePublisher: EventStorePublisher,
 *   ) {}
 *
 *   async approveRequirement(requirementId: string, tenantId: string) {
 *     const requirement = await this.repo.findOne(requirementId);
 *     requirement.approve();
 *
 *     // Publish events - they are automatically persisted and then delivered
 *     await this.eventStorePublisher.publishAll(
 *       requirement.getDomainEvents(),
 *       tenantId,
 *     );
 *   }
 * }
 * ```
 *
 * SLA:
 * - Event persistence: < 100ms
 * - Publisher routing: < 50ms
 * - Total: < 150ms per event (acceptable)
 *
 * Error Handling:
 * - If persistence fails, error is thrown and event is not published
 * - If publisher fails, event is still persisted (doesn't propagate)
 * - Subscribers failing doesn't affect other subscribers
 */
@Injectable()
export class EventStorePublisher {
  private readonly logger = new Logger(EventStorePublisher.name);

  constructor(
    private eventStore: EventStoreService,
    private eventPublisher: DomainEventPublisher,
    private migrationHandler: EventMigrationHandler,
  ) {}

  /**
   * Publish a single event with automatic persistence
   *
   * Process:
   * 1. Persist to EventStore (durable append-only log)
   * 2. Publish to DomainEventPublisher (async handlers)
   *
   * @param event - Event to publish
   * @param tenantId - Tenant identifier
   * @throws Error if persistence fails (event is not published)
   */
  async publish(event: DomainEvent, tenantId: string): Promise<void> {
    try {
      // Persist event first
      await this.eventStore.appendEvent(event, tenantId);

      this.logger.debug(
        `Persisted event ${event.eventType} [${event.eventId}] to EventStore`,
      );

      // Then publish to subscribers
      await this.eventPublisher.publish(event);
    } catch (error) {
      this.logger.error(
        `Failed to publish event ${event.eventType}: ${(error as any).message}`,
        (error as any).stack,
      );

      // Re-throw to prevent partial failures
      throw error;
    }
  }

  /**
   * Publish multiple events atomically
   *
   * Process:
   * 1. Persist all events as batch (all-or-nothing)
   * 2. Publish each to subscribers sequentially
   *
   * All events are persisted together before any are published,
   * ensuring consistency even if publisher fails mid-batch.
   *
   * @param events - Array of events to publish
   * @param tenantId - Tenant identifier
   * @throws Error if batch persistence fails (no events published)
   */
  async publishAll(events: DomainEvent[], tenantId: string): Promise<void> {
    if (events.length === 0) {
      return;
    }

    try {
      // Persist all events as atomic batch
      await this.eventStore.appendEvents(events, tenantId);

      this.logger.debug(
        `Persisted batch of ${events.length} events to EventStore`,
      );

      // Then publish each to subscribers
      for (const event of events) {
        await this.eventPublisher.publish(event);
      }
    } catch (error) {
      this.logger.error(
        `Failed to publish batch of ${events.length} events: ${(error as any).message}`,
        (error as any).stack,
      );

      // Re-throw to prevent partial failures
      throw error;
    }
  }

  /**
   * Replay events from EventStore for aggregate reconstruction
   *
   * Process:
   * 1. Load events from EventStore for aggregate
   * 2. Apply migrations if needed (handle schema evolution)
   * 3. Replay to reconstruct aggregate state
   *
   * Usage:
   * ```typescript
   * // Reconstruct aggregate from event history
   * const events = await this.eventStorePublisher.replayEvents(
   *   aggregateId,
   *   tenantId,
   * );
   *
   * const aggregate = new RequirementAggregate(events[0].data);
   * for (const event of events.slice(1)) {
   *   aggregate.applyEvent(event);
   * }
   * ```
   *
   * @param aggregateId - Aggregate to replay
   * @param tenantId - Tenant identifier
   * @returns Events in chronological order, migrated to latest versions
   */
  async replayEvents(
    aggregateId: string,
    tenantId: string,
  ): Promise<DomainEvent[]> {
    try {
      let events = await this.eventStore.getEventsForAggregate(
        aggregateId,
        tenantId,
      );

      // Apply migrations to handle schema evolution
      events = await Promise.all(
        events.map((event) => this.migrationHandler.migrateIfNeeded(event)),
      );

      this.logger.debug(
        `Replayed ${events.length} events for aggregate ${aggregateId}`,
      );

      return events;
    } catch (error) {
      this.logger.error(
        `Failed to replay events for aggregate ${aggregateId}: ${(error as any).message}`,
        (error as any).stack,
      );

      throw error;
    }
  }

  /**
   * Get events since a specific timestamp
   * Useful for event subscription/watcher patterns
   *
   * @param tenantId - Tenant identifier
   * @param since - Timestamp to start from
   * @returns Events after the timestamp
   */
  async getEventsSince(
    tenantId: string,
    since: Date,
  ): Promise<DomainEvent[]> {
    try {
      const events = await this.eventStore.getEventsSince(tenantId, since);

      this.logger.debug(
        `Retrieved ${events.length} events since ${since.toISOString()}`,
      );

      return events;
    } catch (error) {
      this.logger.error(
        `Failed to get events since ${since}: ${(error as any).message}`,
        (error as any).stack,
      );

      throw error;
    }
  }

  /**
   * Get all events of a specific type for analytics/projections
   *
   * @param tenantId - Tenant identifier
   * @param eventType - Type of event to query
   * @returns All events of the specified type
   */
  async getEventsByType(
    tenantId: string,
    eventType: string,
  ): Promise<DomainEvent[]> {
    try {
      const events = await this.eventStore.getEventsByType(tenantId, eventType);

      this.logger.debug(
        `Retrieved ${events.length} ${eventType} events`,
      );

      return events;
    } catch (error) {
      this.logger.error(
        `Failed to get events of type ${eventType}: ${(error as any).message}`,
        (error as any).stack,
      );

      throw error;
    }
  }

  /**
   * Get all events for an aggregate type (cross-aggregate queries)
   *
   * @param tenantId - Tenant identifier
   * @param aggregateType - Type of aggregate (e.g., 'Requirement', 'Release')
   * @returns All events for aggregates of this type
   */
  async getEventsByAggregateType(
    tenantId: string,
    aggregateType: string,
  ): Promise<DomainEvent[]> {
    try {
      const events = await this.eventStore.getEventsByAggregateType(
        tenantId,
        aggregateType,
      );

      this.logger.debug(
        `Retrieved ${events.length} events for aggregate type ${aggregateType}`,
      );

      return events;
    } catch (error) {
      this.logger.error(
        `Failed to get events for aggregate type ${aggregateType}: ${(error as any).message}`,
        (error as any).stack,
      );

      throw error;
    }
  }

  /**
   * Register a migration for event schema evolution
   *
   * @param eventType - Event type to migrate
   * @param fromVersion - Current version
   * @param toVersion - Target version
   * @param migration - Migration function
   */
  registerMigration(
    eventType: string,
    fromVersion: string,
    toVersion: string,
    migration: (event: any) => any,
  ): void {
    this.migrationHandler.registerMigration(
      eventType,
      fromVersion,
      toVersion,
      migration,
    );
  }
}
