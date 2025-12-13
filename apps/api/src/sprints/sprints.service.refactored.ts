/**
 * REFERENCE IMPLEMENTATION: SprintsService with DDD & Event-Driven Architecture
 *
 * This file demonstrates how SprintsService was migrated from a CRUD-only service
 * to a Domain-Driven Design (DDD) service with event sourcing support.
 *
 * Key Principles Applied:
 * 1. Aggregate Root Pattern: Sprint aggregate encapsulates business logic
 * 2. Domain Events: State changes are captured as immutable events
 * 3. Event Store: All events are persisted for audit trail and replay
 * 4. Event Subscribers: Downstream services react to sprint events asynchronously
 * 5. Backward Compatibility: Existing APIs unchanged, entity-based returns
 *
 * This file can be used as a template for migrating other services.
 * See SERVICE_MIGRATION_GUIDE.md for complete step-by-step migration process.
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sprint, SprintStatus } from './sprint.entity';
import { SprintItem, SprintItemStatus } from './sprint-item.entity';
import { Sprint as SprintAggregate } from './domain/sprint.aggregate';
import { EventStorePublisher } from '../common/event-store/event-store-publisher';
import { DomainEventPublisher } from '../common/domain/domain-event.publisher';

/**
 * MIGRATION PATTERN: Service Layer with Aggregate Support
 *
 * Before:
 * ```typescript
 * async create(name, tenantId, capacity) {
 *   const sprint = this.repo.create({ name, tenantId, capacity });
 *   return this.repo.save(sprint);
 * }
 * ```
 *
 * After (DDD Pattern):
 * ```typescript
 * async create(name, tenantId, capacity, userId?) {
 *   // Step 1: Create aggregate (encapsulates validation)
 *   const aggregate = SprintAggregate.create({...});
 *
 *   // Step 2: Persist entity (backward compatibility)
 *   const saved = await this.repo.save(...);
 *
 *   // Step 3: Publish events (EventStore + subscribers)
 *   await this.eventStorePublisher.publishAll(...);
 *
 *   return saved;
 * }
 * ```
 *
 * Benefits:
 * ✅ Business logic centralized in aggregate (easier to test, understand)
 * ✅ Events captured for audit trail, CQRS, event sourcing
 * ✅ Subscribers notified automatically (decoupled architecture)
 * ✅ Backward compatible (same entity returned, same API)
 * ✅ Can gradually migrate methods (one at a time)
 */
@Injectable()
export class SprintsServiceRefactored {
  constructor(
    @InjectRepository(Sprint)
    private sprintsRepository: Repository<Sprint>,
    @InjectRepository(SprintItem)
    private sprintItemsRepository: Repository<SprintItem>,
    private readonly eventStorePublisher: EventStorePublisher,
    private readonly eventPublisher: DomainEventPublisher,
  ) {}

  // ===== PATTERN 1: CREATE with Event Publishing =====

  /**
   * Create a new sprint
   *
   * Pattern Applied: Aggregate Factory Method + Event Publishing
   *
   * Step-by-step process:
   * 1. Validate and create aggregate (domain logic)
   * 2. Persist entity (database)
   * 3. Update aggregate with generated ID
   * 4. Publish events to EventStore + subscribers
   * 5. Return entity (backward compatible)
   *
   * Events Published:
   * - SprintCreated (captured in EventStore, triggers subscribers)
   *
   * @param name Sprint name
   * @param tenantId Tenant ID for multi-tenancy
   * @param capacity Story points capacity
   * @param goal Optional sprint goal
   * @param startDate Optional start date
   * @param endDate Optional end date
   * @param userId Optional user ID for audit trail
   * @returns Saved sprint entity
   */
  async create(
    name: string,
    tenantId: string,
    capacity: number = 20,
    goal?: string,
    startDate?: Date,
    endDate?: Date,
    userId?: string,
  ): Promise<Sprint> {
    // Step 1: Create aggregate (validates all inputs and business rules)
    // This is where domain logic lives - not in the service
    const now = new Date();
    const defaultStart = startDate || now;
    const defaultEnd =
      endDate || new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    const aggregate = SprintAggregate.create({
      id: '', // Placeholder, will be set after database insert
      tenantId,
      name,
      capacity,
      startDate: defaultStart,
      endDate: defaultEnd,
      description: goal,
      userId,
    });

    // Step 2: Persist entity to database (maintaining backward compatibility)
    // This is the "write" side of CQRS pattern
    const sprintData = this.sprintsRepository.create({
      name,
      tenantId,
      capacity,
      goal,
      startDate: defaultStart,
      endDate: defaultEnd,
      status: SprintStatus.PLANNED,
    });
    const saved = await this.sprintsRepository.save(sprintData);

    // Step 3: Update aggregate with generated ID
    // Need ID before publishing events (events include aggregateId)
    aggregate.id = saved.id;

    // Step 4: Publish all domain events
    // Important: Persist to EventStore BEFORE publishing to subscribers
    // This ensures durability (no events lost) and correct order
    await this.eventStorePublisher.publishAll(
      aggregate.getDomainEvents(),
      tenantId,
    );
    aggregate.clearDomainEvents();

    // Step 5: Return entity (client sees same response format)
    return saved;
  }

  // ===== PATTERN 2: STATE TRANSITIONS with Aggregate Logic =====

  /**
   * Start a sprint (PLANNED → ACTIVE transition)
   *
   * Pattern Applied: Aggregate Reconstruction + Domain Logic + Event Publishing
   *
   * Key insight: Existing sprints don't have aggregates (created before migration).
   * To apply domain logic, we "reconstruct" the aggregate from the entity.
   *
   * Step-by-step process:
   * 1. Fetch existing sprint entity
   * 2. Reconstruct aggregate from entity (time-travel to current state)
   * 3. Apply domain logic via aggregate method (validates state transition)
   * 4. Update entity with new state
   * 5. Publish events to EventStore + subscribers
   *
   * Events Published:
   * - SprintStarted (captured in EventStore, triggers subscribers)
   *
   * Domain Invariants Enforced:
   * - Sprint must be in PLANNED status
   * - Sprint must have at least one item
   * - Sprint dates must be valid
   *
   * @param id Sprint ID
   * @param tenantId Tenant ID
   * @param userId Optional user ID for audit trail
   * @returns Updated sprint entity
   * @throws Error if sprint not found or invalid state transition
   */
  async start(id: string, tenantId: string, userId?: string): Promise<Sprint> {
    // Step 1: Fetch existing sprint
    const sprint = await this.findOne(id, tenantId);

    // Step 2: Reconstruct aggregate from entity
    // This is how we bridge the "gap" for sprints created before DDD migration
    const aggregate = this.reconstructAggregate(sprint);

    // Step 3: Apply domain logic (validates invariants)
    // If sprint is not PLANNED, this throws error
    // If no items, this throws error
    aggregate.start(userId);

    // Step 4: Update entity with new state
    sprint.status = SprintStatus.ACTIVE;
    if (!sprint.startDate) {
      sprint.startDate = new Date();
    }
    if (!sprint.endDate) {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 14);
      sprint.endDate = endDate;
    }
    const saved = await this.sprintsRepository.save(sprint);

    // Step 5: Publish events
    await this.eventStorePublisher.publishAll(
      aggregate.getDomainEvents(),
      tenantId,
    );
    aggregate.clearDomainEvents();

    return saved;
  }

  // ===== PATTERN 3: COMPLEX OPERATIONS with Metrics =====

  /**
   * Complete a sprint (ACTIVE → COMPLETED transition)
   *
   * Pattern Applied: Aggregate Reconstruction + Metrics Collection + Event Publishing
   *
   * This demonstrates how to integrate complex business logic:
   * 1. Reconstruct aggregate
   * 2. Query related entities (sprint items) to gather metrics
   * 3. Call domain logic with metrics
   * 4. Publish events with metrics captured
   *
   * Events Published:
   * - SprintCompleted (includes velocity, completion %, metrics)
   *
   * @param id Sprint ID
   * @param tenantId Tenant ID
   * @param metrics Optional metrics (auto-calculated from items if not provided)
   * @param userId Optional user ID for audit trail
   * @returns Updated sprint entity
   */
  async complete(
    id: string,
    tenantId: string,
    metrics?: {
      completedItems?: number;
      completedStoryPoints?: number;
      velocity?: number;
    },
    userId?: string,
  ): Promise<Sprint> {
    // Step 1: Fetch sprint
    const sprint = await this.findOne(id, tenantId);

    // Step 2: Reconstruct aggregate
    const aggregate = this.reconstructAggregate(sprint);

    // Step 3: Query related entities for metrics
    // Important: Aggregate doesn't query database - service layer does
    // Service provides data to aggregate
    const items = await this.sprintItemsRepository.find({
      where: { sprintId: id, tenantId },
    });

    const completedItems =
      metrics?.completedItems ||
      items.filter((i) => i.status === SprintItemStatus.DONE).length;
    const completedStoryPoints = metrics?.completedStoryPoints || 0;
    const velocity =
      metrics?.velocity ||
      items.filter((i) => i.status === SprintItemStatus.DONE).length;

    // Step 4: Call domain logic with metrics
    // Aggregate validates that sprint is ACTIVE, calculates completion %
    aggregate.complete(
      {
        completedItems,
        completedStoryPoints,
        velocity,
      },
      userId,
    );

    // Step 5: Update entity
    sprint.status = SprintStatus.COMPLETED;
    sprint.velocity = velocity;
    const saved = await this.sprintsRepository.save(sprint);

    // Step 6: Publish events (includes metrics)
    await this.eventStorePublisher.publishAll(
      aggregate.getDomainEvents(),
      tenantId,
    );
    aggregate.clearDomainEvents();

    return saved;
  }

  // ===== PATTERN 4: AGGREGATE RECONSTRUCTION =====

  /**
   * Reconstruct Sprint aggregate from persisted entity
   *
   * Purpose:
   * - Convert entity ↔ aggregate for applying domain logic to existing data
   * - Used for sprints created before DDD migration
   * - Enables gradual migration (some methods use aggregate, others don't)
   *
   * Key Point:
   * - NOT loading events from EventStore
   * - Simply converting entity properties to aggregate properties
   * - No state replay (that's EventSourcing, future Phase 4)
   *
   * Mapping Example:
   * - entity.status → aggregate.status
   * - entity.capacity → aggregate.capacity (via SprintCapacity value object)
   * - entity.goal → aggregate.description
   *
   * @param entity Sprint entity
   * @returns Sprint aggregate
   * @private
   */
  private reconstructAggregate(entity: Sprint): SprintAggregate {
    // Create aggregate instance directly from entity
    const capacity =
      new (require('./domain/value-objects/sprint-capacity.vo').SprintCapacity)(
        entity.capacity,
      );
    const status = (entity.status as any) || 'PLANNED';

    const aggregate = new SprintAggregate(
      entity.id,
      entity.tenantId,
      entity.name,
      capacity,
      entity.startDate || new Date(),
      entity.endDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      status,
      entity.goal,
    );
    aggregate.createdAt = entity.createdAt;
    aggregate.updatedAt = entity.updatedAt;
    return aggregate;
  }

  // ===== HELPER METHODS (unchanged) =====

  async findOne(id: string, tenantId: string): Promise<Sprint> {
    const sprint = await this.sprintsRepository.findOne({
      where: { id, tenantId },
    });
    if (!sprint) {
      throw new NotFoundException(`Sprint ${id} not found`);
    }
    return sprint;
  }

  async findAll(tenantId: string): Promise<Sprint[]> {
    return this.sprintsRepository.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
  }
}

/**
 * ===== MIGRATION CHECKLIST =====
 *
 * ✅ Step 1: Add aggregate imports
 *    - import { Sprint as SprintAggregate } from './domain/sprint.aggregate';
 *    - import { EventStorePublisher } from '../common/event-store/event-store-publisher';
 *
 * ✅ Step 2: Inject new dependencies
 *    - eventStorePublisher: EventStorePublisher
 *    - eventPublisher: DomainEventPublisher
 *
 * ✅ Step 3: Update create() method
 *    - Create aggregate first
 *    - Save entity
 *    - Update aggregate ID
 *    - Publish events
 *
 * ✅ Step 4: Add start() method
 *    - Fetch sprint
 *    - Reconstruct aggregate
 *    - Call aggregate.start()
 *    - Publish events
 *
 * ✅ Step 5: Add complete() method
 *    - Similar pattern to start()
 *    - Query metrics from database
 *    - Pass metrics to aggregate
 *
 * ✅ Step 6: Add reconstructAggregate() helper
 *    - Maps entity ↔ aggregate properties
 *    - Used for existing sprints
 *
 * ✅ Step 7: Update updateStatus() to delegate
 *    - Call start() for ACTIVE
 *    - Call complete() for COMPLETED
 *
 * ⏳ Step 8: Update event subscribers
 *    - SprintStartedSubscriber (implemented)
 *    - SprintCompletedSubscriber (implement next)
 *
 * ⏳ Step 9: Test migration
 *    - Unit tests for aggregate logic
 *    - Integration tests for event flow
 *    - E2E tests for API behavior
 *
 * ⏳ Step 10: Deploy with feature flag
 *    - Enable for 1% of users
 *    - Monitor for 24 hours
 *    - Scale to 100%
 */

/**
 * ===== TESTING STRATEGY =====
 *
 * Unit Tests:
 * ```typescript
 * describe('SprintsService.create()', () => {
 *   it('should create sprint and publish SprintCreated event', async () => {
 *     const sprint = await service.create('Sprint 1', 'tenant-1', 20);
 *     expect(sprint.id).toBeDefined();
 *     expect(eventStorePublisher.publishAll).toHaveBeenCalled();
 *   });
 * });
 * ```
 *
 * Integration Tests:
 * ```typescript
 * describe('SprintsService.start()', () => {
 *   it('should transition sprint to ACTIVE and trigger subscribers', async () => {
 *     // Create sprint
 *     const created = await service.create(...);
 *
 *     // Add item (required to start)
 *     await service.addItem(created.id, 'tenant-1', {...});
 *
 *     // Start sprint
 *     const started = await service.start(created.id, 'tenant-1');
 *
 *     expect(started.status).toBe(SprintStatus.ACTIVE);
 *
 *     // Verify event was published
 *     const events = await eventStore.getEventsByAggregateId(created.id);
 *     expect(events).toContainEqual(expect.objectContaining({
 *       eventType: 'SprintStarted'
 *     }));
 *   });
 * });
 * ```
 */

/**
 * ===== FAQ =====
 *
 * Q: Why create aggregate if we're saving entity anyway?
 * A: The aggregate encapsulates domain logic (validation, invariants).
 *    We get the benefits of DDD without breaking existing APIs.
 *
 * Q: What if aggregate validation fails?
 *    A: Error is thrown before entity is saved. No partial state.
 *
 * Q: How do old sprints (created before migration) work?
 *    A: We reconstruct the aggregate from the entity when needed.
 *       This enables gradual migration of methods.
 *
 * Q: Will this impact performance?
 *    A: Minimal. We add ~2-5ms per operation (aggregate creation).
 *       Event publishing is async, doesn't block API response.
 *
 * Q: Can we roll back if something goes wrong?
 *    A: Yes. Revert to old service code. Events are just logged,
 *       not required for the system to function.
 *
 * Q: How do we test aggregate logic separately?
 *    A: Create aggregate unit tests that don't use repository.
 *       This is much faster and cleaner than service tests.
 */
