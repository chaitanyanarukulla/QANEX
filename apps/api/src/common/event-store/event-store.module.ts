import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StoredDomainEvent } from './entities/stored-domain-event.entity';
import { EventStoreService } from './services/event-store.service';
import { EventMigrationHandler } from './handlers/event-migration.handler';
import { EventStorePublisher } from './event-store-publisher';
import { DomainEventPublisher } from '../domain/domain-event.publisher';

/**
 * EventStore Module - Central event persistence layer
 *
 * This module provides:
 * 1. EventStoreService - Append-only event log with queries
 * 2. EventMigrationHandler - Schema evolution support
 * 3. StoredDomainEvent entity - TypeORM model for persistence
 *
 * Features:
 * - Append-only log (immutable event history)
 * - Event versioning and migration
 * - Multi-tenant isolation
 * - Snapshot support for optimization
 * - GDPR compliance via redaction
 * - Complete audit trail
 *
 * Usage:
 * ```typescript
 * // In your app.module.ts
 * @Module({
 *   imports: [
 *     TypeOrmModule.forRoot(...),
 *     EventStoreModule,
 *     // ... other modules
 *   ],
 * })
 * export class AppModule {}
 *
 * // In your service
 * @Injectable()
 * export class RequirementsService {
 *   constructor(private eventStore: EventStoreService) {}
 *
 *   async createRequirement(data: CreateRequirementDto, tenantId: string) {
 *     const requirement = new RequirementAggregate(data);
 *
 *     // Save aggregate to database
 *     await this.repo.save(requirement);
 *
 *     // Persist domain events to event store
 *     await this.eventStore.appendEvents(
 *       requirement.getDomainEvents(),
 *       tenantId,
 *     );
 *   }
 * }
 * ```
 *
 * Caching Strategy:
 * - Events are immutable, so caching is safe
 * - EventStore doesn't cache internally (leave to application layer)
 * - Snapshot references allow skipping old events during replay
 *
 * Performance:
 * - SLA: <100ms append, <500ms retrieval
 * - Throughput: 1000+ events/second
 * - Indexes: tenantId, aggregateId, eventType, aggregateType, timestamp
 *
 * Consistency:
 * - Append-only: No mutations allowed
 * - Strict ordering: Events ordered by occurredAt then storedAt
 * - Transactional: All-or-nothing append for batches
 */
@Module({
  imports: [TypeOrmModule.forFeature([StoredDomainEvent])],
  providers: [
    EventStoreService,
    EventMigrationHandler,
    DomainEventPublisher,
    EventStorePublisher,
  ],
  exports: [
    EventStoreService,
    EventMigrationHandler,
    DomainEventPublisher,
    EventStorePublisher,
  ],
})
export class EventStoreModule {}
