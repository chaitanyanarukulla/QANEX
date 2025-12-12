import { Injectable, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { StoredDomainEvent } from '../entities/stored-domain-event.entity';

/**
 * EventStoreService
 *
 * Central service for storing and retrieving domain events.
 *
 * Responsibilities:
 * 1. Append events to event store (immutable log)
 * 2. Retrieve events for aggregate replay
 * 3. Support time-travel queries
 * 4. Handle event versioning
 * 5. Manage snapshots for optimization
 *
 * Design Pattern: Event Store (Event Sourcing)
 *
 * SLA: <100ms for append, <500ms for retrieval
 * Throughput: Support 1000+ events/second
 * Consistency: Strict append-only, strong consistency
 *
 * Usage:
 * ```typescript
 * // Store event
 * await eventStore.appendEvent(event, tenantId);
 *
 * // Load aggregate from events
 * const events = await eventStore.getEventsForAggregate(aggregateId, tenantId);
 *
 * // Replay events
 * const aggregate = new Aggregate();
 * for (const event of events) {
 *   aggregate.applyEvent(event);
 * }
 * ```
 */
@Injectable()
export class EventStoreService {
  private readonly logger = new Logger(EventStoreService.name);

  constructor(
    @InjectRepository(StoredDomainEvent)
    private eventRepository: Repository<StoredDomainEvent>,
  ) {}

  /**
   * Append a single event to the event store
   * Immutable append-only operation
   *
   * @param event - Domain event to store
   * @param tenantId - Tenant identifier
   * @throws Error if event already exists (idempotency key)
   */
  async appendEvent(event: any, tenantId: string): Promise<void> {
    const startTime = Date.now();

    try {
      const storedEvent = StoredDomainEvent.fromDomainEvent(event, tenantId);

      await this.eventRepository.insert(storedEvent);

      const duration = Date.now() - startTime;
      this.logger.debug(
        `Appended event ${event.eventType} for ${event.aggregateType}#${event.aggregateId} in ${duration}ms`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to append event ${event.eventType}: ${(error as any).message}`,
        (error as any).stack,
      );
      throw error;
    }
  }

  /**
   * Append multiple events atomically
   * All-or-nothing: either all succeed or all fail
   *
   * @param events - Array of domain events
   * @param tenantId - Tenant identifier
   */
  async appendEvents(events: any[], tenantId: string): Promise<void> {
    if (events.length === 0) {
      return;
    }

    const startTime = Date.now();

    try {
      const storedEvents = events.map((event) =>
        StoredDomainEvent.fromDomainEvent(event, tenantId),
      );

      await this.eventRepository.insert(storedEvents);

      const duration = Date.now() - startTime;
      this.logger.debug(`Appended ${events.length} events in ${duration}ms`);
    } catch (error) {
      this.logger.error(
        `Failed to append ${events.length} events: ${(error as any).message}`,
        (error as any).stack,
      );
      throw error;
    }
  }

  /**
   * Get all events for an aggregate
   * Used for aggregate replay/reconstruction
   *
   * @param aggregateId - ID of aggregate
   * @param tenantId - Tenant identifier
   * @returns Events in chronological order (oldest first)
   */
  async getEventsForAggregate(
    aggregateId: string,
    tenantId: string,
  ): Promise<any[]> {
    const startTime = Date.now();

    try {
      const storedEvents = await this.eventRepository
        .createQueryBuilder('event')
        .where('event.aggregateId = :aggregateId', { aggregateId })
        .andWhere('event.tenantId = :tenantId', { tenantId })
        .orderBy('event.occurredAt', 'ASC')
        .addOrderBy('event.storedAt', 'ASC') // Break ties
        .getMany();

      const duration = Date.now() - startTime;
      this.logger.debug(
        `Retrieved ${storedEvents.length} events for aggregate ${aggregateId} in ${duration}ms`,
      );

      return storedEvents.map((stored) => stored.toDomainEvent());
    } catch (error) {
      this.logger.error(
        `Failed to retrieve events for aggregate ${aggregateId}: ${(error as any).message}`,
        (error as any).stack,
      );
      throw error;
    }
  }

  /**
   * Get events since a specific timestamp
   * Used for watching/subscribing to new events
   *
   * @param tenantId - Tenant identifier
   * @param since - Timestamp to start from
   * @returns Events that occurred after the timestamp
   */
  async getEventsSince(tenantId: string, since: Date): Promise<any[]> {
    try {
      const storedEvents = await this.eventRepository
        .createQueryBuilder('event')
        .where('event.tenantId = :tenantId', { tenantId })
        .andWhere('event.occurredAt > :since', { since })
        .orderBy('event.occurredAt', 'ASC')
        .getMany();

      return storedEvents.map((stored) => stored.toDomainEvent());
    } catch (error) {
      this.logger.error(
        `Failed to retrieve events since ${since}: ${(error as any).message}`,
        (error as any).stack,
      );
      throw error;
    }
  }

  /**
   * Get all events of a specific type
   * Used for event projections and analytics
   *
   * @param tenantId - Tenant identifier
   * @param eventType - Type of event (e.g., 'ReleaseCreated')
   * @returns All events of the specified type
   */
  async getEventsByType(tenantId: string, eventType: string): Promise<any[]> {
    try {
      const storedEvents = await this.eventRepository
        .createQueryBuilder('event')
        .where('event.tenantId = :tenantId', { tenantId })
        .andWhere('event.eventType = :eventType', { eventType })
        .orderBy('event.occurredAt', 'ASC')
        .getMany();

      return storedEvents.map((stored) => stored.toDomainEvent());
    } catch (error) {
      this.logger.error(
        `Failed to retrieve events of type ${eventType}: ${(error as any).message}`,
        (error as any).stack,
      );
      throw error;
    }
  }

  /**
   * Get events by aggregate type
   * Used for cross-aggregate queries
   *
   * @param tenantId - Tenant identifier
   * @param aggregateType - Type of aggregate (e.g., 'Release')
   * @returns All events for aggregates of the specified type
   */
  async getEventsByAggregateType(
    tenantId: string,
    aggregateType: string,
  ): Promise<any[]> {
    try {
      const storedEvents = await this.eventRepository
        .createQueryBuilder('event')
        .where('event.tenantId = :tenantId', { tenantId })
        .andWhere('event.aggregateType = :aggregateType', { aggregateType })
        .orderBy('event.occurredAt', 'ASC')
        .getMany();

      return storedEvents.map((stored) => stored.toDomainEvent());
    } catch (error) {
      this.logger.error(
        `Failed to retrieve events for aggregate type ${aggregateType}: ${(error as any).message}`,
        (error as any).stack,
      );
      throw error;
    }
  }

  /**
   * Get event count for tenant
   * Used for metrics and monitoring
   *
   * @param tenantId - Tenant identifier
   * @returns Total number of events for tenant
   */
  async getEventCount(tenantId: string): Promise<number> {
    try {
      return await this.eventRepository
        .createQueryBuilder('event')
        .where('event.tenantId = :tenantId', { tenantId })
        .getCount();
    } catch (error) {
      this.logger.error(
        `Failed to count events: ${(error as any).message}`,
        (error as any).stack,
      );
      throw error;
    }
  }

  /**
   * Store snapshot for optimization
   * Snapshots allow skipping old events during replay
   *
   * @param aggregateId - Aggregate ID
   * @param tenantId - Tenant identifier
   * @param snapshotId - Reference to snapshot
   * @param afterEventId - Events after this point can be skipped
   */
  async recordSnapshot(
    aggregateId: string,
    tenantId: string,
    snapshotId: string,
    afterEventId: string,
  ): Promise<void> {
    try {
      // Update recent events to reference this snapshot
      await this.eventRepository
        .createQueryBuilder()
        .update(StoredDomainEvent)
        .set({ snapshotId })
        .where('aggregateId = :aggregateId', { aggregateId })
        .andWhere('tenantId = :tenantId', { tenantId })
        .andWhere(
          'occurredAt > (SELECT occurredAt FROM stored_domain_events WHERE eventId = :afterEventId)',
          {
            afterEventId,
          },
        )
        .execute();

      this.logger.debug(
        `Recorded snapshot ${snapshotId} for aggregate ${aggregateId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to record snapshot: ${(error as any).message}`,
        (error as any).stack,
      );
      throw error;
    }
  }

  /**
   * Redact event data for GDPR compliance
   * Soft-delete: marks event as redacted but keeps record
   *
   * @param eventId - Event to redact
   * @param tenantId - Tenant identifier
   */
  async redactEvent(eventId: string, tenantId: string): Promise<void> {
    try {
      await this.eventRepository
        .createQueryBuilder()
        .update(StoredDomainEvent)
        .set({
          isRedacted: true,
          eventData: { redacted: true } as any,
        })
        .where('eventId = :eventId', { eventId })
        .andWhere('tenantId = :tenantId', { tenantId })
        .execute();

      this.logger.debug(`Redacted event ${eventId}`);
    } catch (error) {
      this.logger.error(
        `Failed to redact event: ${(error as any).message}`,
        (error as any).stack,
      );
      throw error;
    }
  }

  /**
   * Clear all events for tenant (for testing only)
   * WARNING: Destructive operation - use with caution
   *
   * @param tenantId - Tenant identifier
   */
  async clearTenantEvents(tenantId: string): Promise<void> {
    this.logger.warn(`Clearing all events for tenant ${tenantId}`);

    try {
      await this.eventRepository
        .createQueryBuilder()
        .delete()
        .where('tenantId = :tenantId', { tenantId })
        .execute();

      this.logger.warn(`Cleared all events for tenant ${tenantId}`);
    } catch (error) {
      this.logger.error(
        `Failed to clear tenant events: ${(error as any).message}`,
        (error as any).stack,
      );
      throw error;
    }
  }
}
