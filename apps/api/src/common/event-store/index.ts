/**
 * Event Store Module - Append-only event persistence layer
 *
 * Provides foundation for event-driven architecture with:
 * - Immutable event log
 * - Event versioning and migrations
 * - Event replay for aggregate reconstruction
 * - Multi-tenant isolation
 * - GDPR compliance (redaction)
 * - Performance optimizations (snapshots)
 */

// Services
export { EventStoreService } from './services/event-store.service';
export { EventStorePublisher } from './event-store-publisher';

// Handlers
export { EventMigrationHandler } from './handlers/event-migration.handler';

// Entities
export { StoredDomainEvent } from './entities/stored-domain-event.entity';

// Module
export { EventStoreModule } from './event-store.module';
