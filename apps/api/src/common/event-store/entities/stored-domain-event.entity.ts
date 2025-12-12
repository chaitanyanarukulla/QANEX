import { Entity, Column, PrimaryColumn, CreateDateColumn, Index } from 'typeorm';

/**
 * StoredDomainEvent Entity
 *
 * Persists domain events to the database for event sourcing and audit trails.
 *
 * Event Store Pattern:
 * - Append-only log of all domain events
 * - Immutable records (no updates)
 * - Enables event replay for CQRS
 * - Complete audit trail of system changes
 *
 * Features:
 * 1. **Event Sourcing**: Rebuild aggregate state by replaying events
 * 2. **Audit Trail**: Complete history of all state changes
 * 3. **Temporal Queries**: Find state at any point in time
 * 4. **Event Versioning**: Support for event schema evolution
 * 5. **Multi-tenant**: Isolated event streams per tenant
 *
 * Indexes:
 * - (tenantId, aggregateId): Find events for specific aggregate
 * - (tenantId, eventType): Find all events of type
 * - (tenantId, occurredAt): Time-series queries
 * - (tenantId, aggregateType): Query by aggregate type
 *
 * Storage Strategy:
 * - Large events stored as JSON (TypeORM handles serialization)
 * - Separate columns for quick filtering without deserialization
 * - eventData as JSONB for PostgreSQL full-text search
 *
 * Performance Considerations:
 * - Append-only: no locks or conflicts
 * - Partitioning by tenantId for horizontal scaling
 * - Eventual consistency: batch read for performance
 * - Snapshot support: optional aggregation for faster replay
 *
 * Migration Path:
 * - Start with storing all events
 * - Add snapshot support for large aggregates
 * - Enable event versioning for schema changes
 * - Implement projection materialization
 */
@Entity('stored_domain_events')
@Index(['tenantId', 'aggregateId'])
@Index(['tenantId', 'eventType'])
@Index(['tenantId', 'occurredAt'])
@Index(['tenantId', 'aggregateType'])
@Index(['aggregateId', 'aggregateType'])
export class StoredDomainEvent {
  /**
   * Unique identifier for the stored event
   * Format: {eventType}-{aggregateId}-{timestamp}
   */
  @PrimaryColumn('varchar')
  eventId!: string;

  /**
   * Tenant ID for multi-tenancy
   * All queries must filter by tenantId
   */
  @Column('varchar')
  tenantId!: string;

  /**
   * ID of the aggregate that generated this event
   * Used to find all events for an aggregate
   */
  @Column('varchar')
  aggregateId!: string;

  /**
   * Type of aggregate (Release, Sprint, Bug, TestRun, etc.)
   * Used for querying by aggregate type
   */
  @Column('varchar')
  aggregateType!: string;

  /**
   * Type of event (ReleaseCreated, BugTriaged, etc.)
   * Used for event routing and versioning
   */
  @Column('varchar')
  eventType!: string;

  /**
   * Version of this event type (for migration support)
   * Allows handling multiple versions of same event type
   * Example: v1, v2 for ReleaseCreated with schema changes
   */
  @Column('varchar', { default: 'v1' })
  eventVersion!: string;

  /**
   * When the event occurred in business time
   * May differ from database insertion time
   */
  @Column('timestamp')
  occurredAt!: Date;

  /**
   * When the event was stored in database
   * Used for detecting out-of-order storage
   */
  @CreateDateColumn()
  storedAt!: Date;

  /**
   * Full event data as JSON
   * Contains all event properties and metadata
   * Stored as JSONB in PostgreSQL for efficient querying
   */
  @Column('jsonb')
  eventData!: Record<string, any>;

  /**
   * Metadata about event correlation
   * For tracking event relationships across contexts
   */
  @Column('jsonb', { nullable: true })
  metadata?: {
    correlationId?: string; // Link related events
    causationId?: string; // Event that caused this one
    userId?: string; // Who triggered the event
    ipAddress?: string; // For audit logging
    source?: string; // Where event came from
    tags?: string[]; // For categorization
  };

  /**
   * Optional snapshot reference
   * Points to latest snapshot for this aggregate
   * Optimization: only replay events since snapshot
   */
  @Column('varchar', { nullable: true })
  snapshotId?: string;

  /**
   * Optional: flag for deleted/tombstoned events
   * Used for GDPR compliance (soft delete)
   * Events still exist but data is redacted
   */
  @Column('boolean', { default: false })
  isRedacted!: boolean;

  /**
   * Create a StoredDomainEvent from a domain event
   *
   * @param event - Domain event to store
   * @param tenantId - Tenant identifier
   * @returns StoredDomainEvent entity ready for persistence
   */
  static fromDomainEvent(
    event: any,
    tenantId: string,
  ): StoredDomainEvent {
    const stored = new StoredDomainEvent();
    stored.eventId = event.eventId;
    stored.tenantId = tenantId;
    stored.aggregateId = event.aggregateId;
    stored.aggregateType = event.aggregateType;
    stored.eventType = event.eventType;
    stored.eventVersion = 'v1';
    stored.occurredAt = event.occurredAt;
    stored.eventData = this.serializeEvent(event);
    stored.isRedacted = false;

    return stored;
  }

  /**
   * Serialize domain event to JSON
   * Removes circular references and functions
   *
   * @private
   */
  private static serializeEvent(event: any): Record<string, any> {
    const serialized: Record<string, any> = {
      eventId: event.eventId,
      eventType: event.eventType,
      aggregateId: event.aggregateId,
      aggregateType: event.aggregateType,
      tenantId: event.tenantId,
      occurredAt: event.occurredAt,
      userId: event.userId,
    };

    // Include event-specific data
    for (const key in event) {
      if (
        !['eventId', 'eventType', 'aggregateId', 'aggregateType', 'tenantId', 'occurredAt', 'userId', 'readonly'].includes(key)
      ) {
        serialized[key] = event[key];
      }
    }

    return serialized;
  }

  /**
   * Reconstruct domain event from stored event
   * Used when loading events for replay
   *
   * @returns Hydrated domain event object
   */
  toDomainEvent(): any {
    return {
      ...this.eventData,
      eventId: this.eventId,
      occurredAt: this.occurredAt,
    };
  }

  /**
   * Get event summary for logging
   */
  getSummary(): string {
    return `${this.eventType} for ${this.aggregateType}#${this.aggregateId}`;
  }
}
