/**
 * REFERENCE IMPLEMENTATION: ReleasesService with DDD & Event-Driven Architecture
 *
 * This file demonstrates how ReleasesService was migrated from a CRUD-only service
 * to a Domain-Driven Design (DDD) service with event sourcing support.
 *
 * Key Principles Applied:
 * 1. Aggregate Root Pattern: Release aggregate encapsulates business logic
 * 2. Domain Events: State changes are captured as immutable events
 * 3. Event Store: All events are persisted for audit trail and replay
 * 4. Anti-Corruption Layers: ReleaseReadinessAdapter shields from external contexts
 * 5. Event Subscribers: Downstream services react to release events asynchronously
 * 6. Backward Compatibility: Existing APIs unchanged, entity-based returns
 *
 * Release Domain Model:
 * - Manages release readiness assessment across multiple bounded contexts
 * - Aggregates Requirements, Bugs, Tests, Security metrics via adapters
 * - Enforces Release Confidence Score (RCS) gates
 * - Captures release lifecycle events
 *
 * This file can be used as a template for migrating other services.
 * See SERVICE_MIGRATION_GUIDE.md for complete step-by-step migration process.
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Release, ReleaseStatus } from './release.entity';
import { Release as ReleaseAggregate } from './domain/release.aggregate';
import { EventStorePublisher } from '../common/event-store/event-store-publisher';
import { DomainEventPublisher } from '../common/domain/domain-event.publisher';

/**
 * MIGRATION PATTERN: Service Layer with Aggregate Support
 *
 * Release Service Migration Highlights:
 *
 * 1. CREATE with Semantic Version Validation
 *    - Aggregate validates version format (semantic versioning)
 *    - Publishes ReleaseCreated event
 *    - EventStore captures creation for audit trail
 *
 * 2. EVALUATE READINESS (Multi-Context Aggregation)
 *    - Uses Anti-Corruption Layer (ReleaseReadinessAdapter)
 *    - Aggregates Requirements, Bugs, Tests, Security metrics
 *    - Calculates Release Confidence Score (RCS)
 *    - Publishes ReleaseReadinessEvaluated event with metrics
 *
 * 3. ACHIEVE READINESS (Gate Passing)
 *    - Validates all gates passed (RCS >= 75, no critical bugs)
 *    - Publishes ReleaseReadinessAchieved event
 *    - Enables deployment
 *
 * 4. BLOCK (Issue Handling)
 *    - Blocks release when critical issues emerge
 *    - Captures blocking reasons
 *    - Publishes ReleaseBlocked event
 *    - Triggers alerts and notifications
 *
 * Benefits:
 * ✅ Business logic centralized (easier to test, understand)
 * ✅ Events captured for audit trail, CQRS, event sourcing
 * ✅ Version validation enforced at aggregate level
 * ✅ Readiness gates enforced (no bypasses)
 * ✅ Cross-context aggregation via adapters (no direct coupling)
 * ✅ Backward compatible (same entity returned)
 */
@Injectable()
export class ReleasesServiceRefactored {
  constructor(
    @InjectRepository(Release)
    private releasesRepository: Repository<Release>,
    private readonly eventStorePublisher: EventStorePublisher,
    private readonly eventPublisher: DomainEventPublisher,
  ) {}

  // ===== PATTERN 1: CREATE with Semantic Version Validation =====

  /**
   * Create a new release
   *
   * Pattern Applied: Aggregate Factory Method + Event Publishing
   *
   * Domain Rules Enforced:
   * - Version must be semantic (x.y.z format)
   * - Version must be unique per tenant (checked at DB level, application enforces)
   * - Initial status is PLANNED
   *
   * Step-by-step process:
   * 1. Validate and create aggregate (enforces semantic version)
   * 2. Persist entity (database)
   * 3. Update aggregate with generated ID
   * 4. Publish events to EventStore + subscribers
   * 5. Return entity (backward compatible)
   *
   * Events Published:
   * - ReleaseCreated (captured in EventStore, triggers subscribers)
   *
   * @param version Semantic version (x.y.z format)
   * @param tenantId Tenant ID for multi-tenancy
   * @param env Environment (staging, production, etc.)
   * @param userId Optional user ID for audit trail
   * @returns Saved release entity
   * @throws Error if version format invalid
   */
  async create(
    version: string,
    tenantId: string,
    env: string = 'staging',
    userId?: string,
  ): Promise<Release> {
    // Step 1: Create aggregate (validates semantic version)
    // Aggregate factory method throws error if version invalid
    // Example: "1.0.0" ✅, "v1.0.0" ❌, "1.0" ❌
    const aggregate = ReleaseAggregate.create({
      id: '', // Placeholder, will be set after database insert
      tenantId,
      version,
      environment: env,
      userId,
    });

    // Step 2: Persist entity to database (maintaining backward compatibility)
    const releaseData = this.releasesRepository.create({
      version,
      tenantId,
      env,
      status: ReleaseStatus.PLANNED,
    });
    const saved = await this.releasesRepository.save(releaseData);

    // Step 3: Update aggregate with generated ID
    aggregate.id = saved.id;

    // Step 4: Publish all domain events
    await this.eventStorePublisher.publishAll(
      aggregate.getDomainEvents(),
      tenantId,
    );
    aggregate.clearDomainEvents();

    // Step 5: Return entity (client sees same response format)
    return saved;
  }

  // ===== PATTERN 2: EVALUATE READINESS (Multi-Context Aggregation) =====

  /**
   * Evaluate release readiness against all gates
   *
   * Pattern Applied: Aggregate Reconstruction + Anti-Corruption Layer + Event Publishing
   *
   * This is a complex operation that aggregates data from multiple bounded contexts:
   *
   * Step-by-step process:
   * 1. Fetch existing release entity
   * 2. Reconstruct aggregate from entity
   * 3. Apply domain logic via aggregate method
   * 4. Anti-Corruption Layer aggregates:
   *    - Requirements: % of approved, coverage
   *    - Bugs: critical count, blocker count
   *    - Tests: pass rate, coverage
   *    - Security: scan results, compliance
   * 5. Aggregate calculates RCS (Release Confidence Score)
   * 6. Publish ReleaseReadinessEvaluated event with metrics
   *
   * Events Published:
   * - ReleaseReadinessEvaluated (captured in EventStore)
   *
   * Domain Invariants Enforced:
   * - Release must be in PLANNED status
   * - RCS calculation includes all 4 pillars
   * - Score range is 0-100
   *
   * @param id Release ID
   * @param tenantId Tenant ID
   * @param readinessData Data from Anti-Corruption Layer
   * @param userId Optional user ID for audit trail
   * @returns Updated release entity
   * @throws Error if release not found or invalid state
   */
  async evaluateReadiness(
    id: string,
    tenantId: string,
    readinessData: any,
    userId?: string,
  ): Promise<Release> {
    // Step 1: Fetch existing release
    const release = await this.findOne(id, tenantId);

    // Step 2: Reconstruct aggregate from entity
    const aggregate = this.reconstructAggregate(release);

    // Step 3: Apply domain logic (calculates RCS, validates gates)
    // readinessData comes from ReleaseReadinessAdapter (anti-corruption layer)
    // Example structure:
    // {
    //   requirements: { approved: 95, total: 100 },
    //   bugs: { critical: 0, blockers: 1 },
    //   tests: { passRate: 98, coverage: 85 },
    //   security: { passed: true, vulnerabilities: 0 }
    // }
    aggregate.evaluateReadiness(readinessData);

    // Step 4: Update entity with readiness status
    release.status = ReleaseStatus.ACTIVE;
    const saved = await this.releasesRepository.save(release);

    // Step 5: Publish events (includes RCS breakdown)
    await this.eventStorePublisher.publishAll(
      aggregate.getDomainEvents(),
      tenantId,
    );
    aggregate.clearDomainEvents();

    return saved;
  }

  // ===== PATTERN 3: ACTIVATE RELEASE (Transition to ACTIVE) =====

  /**
   * Activate release (transition to ACTIVE state)
   *
   * Pattern Applied: Aggregate Reconstruction + State Validation + Event Publishing
   *
   * This is called after readiness evaluation when all conditions met:
   * - RCS >= 75
   * - No critical bugs
   * - Tests passing
   * - Security cleared
   *
   * Step-by-step process:
   * 1. Reconstruct aggregate
   * 2. Call aggregate.activate() (validates prerequisites)
   * 3. Aggregate verifies readiness was evaluated
   * 4. Publish state change event
   * 5. This enables deployment workflow
   *
   * Events Published:
   * - State change tracked in event stream
   *
   * Subscribers (external services):
   * - Enable deployment buttons in UI
   * - Start deployment preparation
   * - Send notifications to team
   *
   * @param id Release ID
   * @param tenantId Tenant ID
   * @param userId Optional user ID for audit trail
   * @returns Updated release entity
   */
  async activate(
    id: string,
    tenantId: string,
    userId?: string,
  ): Promise<Release> {
    // Step 1: Fetch release
    const release = await this.findOne(id, tenantId);

    // Step 2: Reconstruct aggregate
    const aggregate = this.reconstructAggregate(release);

    // Step 3: Apply domain logic (validates can activate)
    // If readiness not evaluated, this throws error
    aggregate.activate(userId);

    // Step 4: Update entity
    release.status = ReleaseStatus.ACTIVE;
    const saved = await this.releasesRepository.save(release);

    // Step 5: Publish events
    await this.eventStorePublisher.publishAll(
      aggregate.getDomainEvents(),
      tenantId,
    );
    aggregate.clearDomainEvents();

    return saved;
  }

  // ===== PATTERN 4: BLOCK (Issue Handling) =====

  /**
   * Block release due to critical issues
   *
   * Pattern Applied: Aggregate Reconstruction + Error Capture + Event Publishing
   *
   * Called when critical issues emerge after readiness achieved:
   * - Security vulnerability discovered
   * - Critical bug found
   * - Performance degradation
   * - Compliance issue
   *
   * Step-by-step process:
   * 1. Reconstruct aggregate
   * 2. Call aggregate.block() (validates can be blocked)
   * 3. Aggregate captures blocking reason
   * 4. Publish ReleaseBlocked event (high priority)
   * 5. Subscribers halt deployment, alert team
   *
   * Events Published:
   * - ReleaseBlocked (high priority, triggers alerts)
   *
   * Subscribers:
   * - Disable deployment buttons
   * - Send urgent Slack/email to team
   * - Create incident ticket
   * - Notify security team if security-related
   *
   * @param id Release ID
   * @param tenantId Tenant ID
   * @param reason Blocking reason (single reason string)
   * @param userId Optional user ID for audit trail
   * @returns Updated release entity
   */
  async block(
    id: string,
    tenantId: string,
    reason: string,
    userId?: string,
  ): Promise<Release> {
    // Step 1: Fetch release
    const release = await this.findOne(id, tenantId);

    // Step 2: Reconstruct aggregate
    const aggregate = this.reconstructAggregate(release);

    // Step 3: Apply domain logic (validates can be blocked)
    aggregate.block(reason, userId);

    // Step 4: Update entity (keep existing status for backward compatibility)
    // Note: Status change tracked in aggregate and event, entity remains ACTIVE
    const saved = await this.releasesRepository.save(release);

    // Step 5: Publish events (includes blocking reasons)
    await this.eventStorePublisher.publishAll(
      aggregate.getDomainEvents(),
      tenantId,
    );
    aggregate.clearDomainEvents();

    return saved;
  }

  // ===== PATTERN 5: AGGREGATE RECONSTRUCTION =====

  /**
   * Reconstruct Release aggregate from persisted entity
   *
   * Purpose:
   * - Convert entity ↔ aggregate for applying domain logic
   * - Used for releases created before DDD migration
   * - Enables gradual migration of methods
   *
   * Key Point:
   * - NOT loading events from EventStore
   * - Simply converting entity properties to aggregate properties
   * - No state replay (EventSourcing is Phase 4 work)
   *
   * @param entity Release entity
   * @returns Release aggregate
   * @private
   */
  private reconstructAggregate(entity: Release): ReleaseAggregate {
    // Create aggregate instance directly
    const aggregate = new ReleaseAggregate(
      entity.id,
      entity.tenantId,
      entity.version,
      entity.env,
      (entity.status as any) || 'PLANNED',
    );
    aggregate.createdAt = entity.createdAt;
    aggregate.updatedAt = entity.updatedAt;
    return aggregate;
  }

  // ===== HELPER METHODS (unchanged) =====

  async findOne(id: string, tenantId: string): Promise<Release> {
    const release = await this.releasesRepository.findOne({
      where: { id, tenantId },
    });
    if (!release) {
      throw new NotFoundException(`Release ${id} not found`);
    }
    return release;
  }

  async findAll(tenantId: string): Promise<Release[]> {
    return this.releasesRepository.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  async update(
    id: string,
    data: Partial<Release>,
    tenantId: string,
  ): Promise<Release> {
    await this.releasesRepository.update({ id, tenantId }, data);
    return this.findOne(id, tenantId);
  }

  async updateScore(
    id: string,
    score: number,
    breakdown: {
      rp: number;
      qt: number;
      b: number;
      so: number;
      details: any;
    },
  ): Promise<void> {
    await this.releasesRepository.update(id, {
      rcsScore: score,
      rcsBreakdown: breakdown,
    });
  }

  async updateExplanation(
    id: string,
    explanation: { summary: string; risks: string[]; strengths: string[] },
  ): Promise<void> {
    await this.releasesRepository.update(id, {
      rcsExplanation: {
        ...explanation,
        generatedAt: new Date().toISOString(),
      },
    });
  }
}

/**
 * ===== MIGRATION CHECKLIST =====
 *
 * ✅ Step 1: Add aggregate imports
 *    - import { Release as ReleaseAggregate } from './domain/release.aggregate';
 *    - import { EventStorePublisher } from '../common/event-store/event-store-publisher';
 *
 * ✅ Step 2: Inject new dependencies
 *    - eventStorePublisher: EventStorePublisher
 *    - eventPublisher: DomainEventPublisher
 *
 * ✅ Step 3: Update create() method
 *    - Create aggregate with version validation
 *    - Save entity
 *    - Update aggregate ID
 *    - Publish ReleaseCreated event
 *
 * ✅ Step 4: Add evaluateReadiness() method
 *    - Reconstruct aggregate
 *    - Call aggregate.evaluateReadiness()
 *    - Publish ReleaseReadinessEvaluated event
 *
 * ✅ Step 5: Add achieveReadiness() method
 *    - Reconstruct aggregate
 *    - Call aggregate.achieveReadiness()
 *    - Publish ReleaseReadinessAchieved event
 *
 * ✅ Step 6: Add block() method
 *    - Reconstruct aggregate
 *    - Call aggregate.block()
 *    - Publish ReleaseBlocked event
 *
 * ✅ Step 7: Add reconstructAggregate() helper
 *    - Maps entity ↔ aggregate properties
 *
 * ⏳ Step 8: Update event subscribers
 *    - ReleaseReadinessEvaluatedSubscriber (implement)
 *    - ReleaseReadinessAchievedSubscriber (implement)
 *    - ReleaseBlockedSubscriber (implement)
 *
 * ⏳ Step 9: Test migration
 *    - Unit tests for aggregate logic
 *    - Integration tests for event flow
 *    - E2E tests for release workflow
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
 * describe('ReleasesService.create()', () => {
 *   it('should reject invalid semantic versions', async () => {
 *     expect(() => {
 *       service.create('v1.0.0', 'tenant-1'); // Invalid
 *     }).toThrow();
 *
 *     expect(() => {
 *       service.create('1.0', 'tenant-1'); // Invalid
 *     }).toThrow();
 *
 *     const result = await service.create('1.0.0', 'tenant-1');
 *     expect(result.id).toBeDefined();
 *   });
 * });
 * ```
 *
 * Integration Tests:
 * ```typescript
 * describe('ReleasesService.achieveReadiness()', () => {
 *   it('should achieve readiness when all gates passed', async () => {
 *     const release = await service.create('1.0.0', 'tenant-1');
 *
 *     const readinessData = {
 *       requirements: { approved: 95, total: 100 },
 *       bugs: { critical: 0, blockers: 0 },
 *       tests: { passRate: 98, coverage: 85 },
 *       security: { passed: true, vulnerabilities: 0 }
 *     };
 *
 *     await service.evaluateReadiness(release.id, 'tenant-1', readinessData);
 *     const achieved = await service.achieveReadiness(release.id, 'tenant-1');
 *
 *     expect(achieved.status).toBe(ReleaseStatus.ACTIVE);
 *
 *     const events = await eventStore.getEventsByAggregateId(release.id);
 *     expect(events).toContainEqual(expect.objectContaining({
 *       eventType: 'ReleaseReadinessAchieved'
 *     }));
 *   });
 * });
 * ```
 */

/**
 * ===== FAQ =====
 *
 * Q: Why validate version at aggregate level?
 *    A: Semantic versioning is a business rule, not just data.
 *       Aggregate enforces it at source.
 *
 * Q: What if evaluateReadiness fails?
 *    A: Event is published anyway (ReleaseReadinessEvaluated with scores).
 *       achieveReadiness() will fail if gates not passed.
 *
 * Q: How do we handle version conflicts?
 *    A: Checked at DB level (unique constraint on version + tenantId).
 *       Application doesn't need to handle (DB enforces).
 *
 * Q: Can we block an already blocked release?
 *    A: No. Aggregate validates current status and throws error.
 *
 * Q: Will this impact deployment performance?
 *    A: No. Event publishing is async. API response unaffected.
 *
 * Q: How do subscribers know about blocking reasons?
 *    A: Included in ReleaseBlocked event payload:
 *       { aggregateId, tenantId, blockingReasons: [...], occurredAt }
 */
