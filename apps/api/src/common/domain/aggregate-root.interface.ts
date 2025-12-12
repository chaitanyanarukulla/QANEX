/**
 * Base interface for all Domain-Driven Design (DDD) aggregate roots.
 *
 * An aggregate root is an entity that serves as the entry point to an aggregate.
 * It is responsible for maintaining invariants and coordinating changes within its aggregate.
 *
 * @template TId The type of the aggregate's unique identifier
 */
export interface AggregateRoot<TId = string> {
  /**
   * The unique identifier of this aggregate root.
   * Must be immutable after creation.
   */
  id: TId;

  /**
   * Get the domain events that occurred within this aggregate.
   * Events are published after the aggregate is persisted.
   *
   * @returns Array of domain events
   */
  getDomainEvents(): DomainEvent[];

  /**
   * Clear the domain events after they have been published.
   * Should be called after successful event publishing.
   */
  clearDomainEvents(): void;
}

/**
 * Base interface for all domain events.
 *
 * Domain events represent things that happened within the domain and are of interest.
 * They are published when aggregate state changes occur.
 *
 * Example events:
 * - RequirementCreated
 * - RequirementApproved
 * - TasksGenerated
 */
export interface DomainEvent {
  /**
   * The unique identifier for this event instance.
   * Useful for idempotency and event deduplication.
   */
  eventId: string;

  /**
   * When this event occurred.
   */
  occurredAt: Date;

  /**
   * The type/name of this event (e.g., 'RequirementCreated').
   * Used for event routing and subscriber matching.
   */
  eventType: string;

  /**
   * The aggregate ID that this event belongs to.
   */
  aggregateId: string;

  /**
   * The type of aggregate this event belongs to (e.g., 'Requirement', 'Release').
   */
  aggregateType: string;

  /**
   * The version of the aggregate at the time this event occurred.
   * Useful for event sourcing implementations.
   */
  aggregateVersion?: number;

  /**
   * The tenant ID for multi-tenant support.
   * Ensures events are properly isolated by tenant.
   */
  tenantId: string;

  /**
   * The user ID who triggered this event (if applicable).
   */
  userId?: string;

  /**
   * Additional metadata about the event context.
   */
  metadata?: Record<string, any>;
}

/**
 * Base interface for value objects.
 *
 * Value objects are immutable, have no unique identity, and are compared by their values.
 * Examples: RQSScore, Priority, Status enums
 */
export interface ValueObject<T = any> {
  /**
   * Get the value of this value object.
   * For complex value objects, returns the structured representation.
   */
  getValue(): T;

  /**
   * Check if this value object is equal to another by comparing values.
   */
  equals(other: ValueObject<T>): boolean;
}

/**
 * Base interface for repository operations on aggregate roots.
 *
 * Repositories abstract the persistence mechanism and provide a collection-like interface
 * for accessing aggregates.
 *
 * @template T The aggregate root type
 * @template TId The type of the aggregate's unique identifier
 */
export interface Repository<T extends AggregateRoot, TId = string> {
  /**
   * Save (create or update) an aggregate root.
   *
   * @param aggregate The aggregate to save
   * @returns The saved aggregate
   */
  save(aggregate: T): Promise<T>;

  /**
   * Find an aggregate by its ID.
   *
   * @param id The aggregate ID
   * @throws NotFoundException if aggregate not found
   */
  findById(id: TId): Promise<T>;

  /**
   * Find all aggregates for a tenant.
   */
  findAll(tenantId: string): Promise<T[]>;

  /**
   * Delete an aggregate.
   */
  delete(id: TId): Promise<void>;
}

/**
 * Base class that can be extended by aggregates to implement DDD patterns.
 *
 * Provides:
 * - Domain event collection and publishing
 * - Base aggregate root functionality
 */
export abstract class BaseDomainAggregate implements AggregateRoot<string> {
  protected domainEvents: DomainEvent[] = [];

  abstract id: string;
  abstract tenantId: string;

  /**
   * Add a domain event to be published.
   *
   * @param event The domain event that occurred
   */
  protected addDomainEvent(event: DomainEvent): void {
    this.domainEvents.push(event);
  }

  /**
   * Get all domain events for this aggregate.
   */
  getDomainEvents(): DomainEvent[] {
    return this.domainEvents;
  }

  /**
   * Clear all domain events after they've been published.
   */
  clearDomainEvents(): void {
    this.domainEvents = [];
  }

  /**
   * Create a domain event with common properties pre-filled.
   *
   * @param eventType The type of event
   * @param aggregateType The type of aggregate
   * @param payload Additional event-specific data
   */
  protected createDomainEvent(
    eventType: string,
    aggregateType: string,
    userId?: string,
    payload?: Record<string, any>,
  ): DomainEvent {
    return {
      eventId: `${aggregateType}-${this.id}-${Date.now()}`,
      eventType,
      aggregateId: this.id,
      aggregateType,
      tenantId: this.tenantId,
      userId,
      occurredAt: new Date(),
      metadata: payload,
    };
  }
}
