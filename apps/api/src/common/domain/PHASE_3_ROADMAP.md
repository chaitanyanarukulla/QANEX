# Phase 3: DDD Implementation Roadmap

## Overview

Phase 3 focuses on **completing the DDD implementation** by:
1. Creating remaining aggregate roots and their domain events
2. Implementing domain event subscribers for cross-context workflows
3. Adding anti-corruption layers for bounded context communication
4. Migrating existing services to use DDD patterns
5. Establishing event-driven workflows

**Timeline**: 4-6 weeks
**Priority**: HIGH - Foundation for Event Sourcing and CQRS
**Risk**: LOW - Backward compatible, non-breaking changes

---

## Tasks Breakdown

### Task 1: Sprint Aggregate (Week 1)

**Goal**: Create Sprint bounded context aggregate root with full domain logic.

**Deliverables**:

1. **Sprint Aggregate Root** - `/src/sprints/domain/sprint.aggregate.ts`
   ```typescript
   class Sprint implements AggregateRoot {
     id: string;
     name: string;
     status: SprintStatus; // PLANNED → ACTIVE → COMPLETED
     capacity: SprintCapacity;
     items: SprintItem[];

     // Domain methods
     create(name, capacity): void
     addItem(item, capacity check): void
     removeItem(itemId): void
     start(): void
     complete(metrics): void
   }
   ```

2. **Value Objects**:
   - `SprintCapacity` - Manages story points with validation
   - `SprintStatus` - Enumeration
   - `Velocity` - Historical velocity tracking

3. **Domain Events**:
   - `SprintCreated` - New sprint initialized
   - `SprintStarted` - Sprint moved to ACTIVE
   - `ItemAddedToSprint` - Item added to sprint
   - `ItemRemovedFromSprint` - Item removed
   - `SprintCompleted` - Sprint finished with metrics
   - `CapacityExceeded` - Warning event

4. **Tests**: Unit tests for aggregate invariants
   - Cannot add items to non-PLANNED sprint
   - Cannot exceed capacity
   - Cannot transition directly from PLANNED to COMPLETED

---

### Task 2: Release Aggregate (Week 1-2)

**Goal**: Create Release bounded context with RCS (Release Confidence Score) calculation.

**Deliverables**:

1. **Release Aggregate Root** - `/src/releases/domain/release.aggregate.ts`
   ```typescript
   class Release implements AggregateRoot {
     id: string;
     version: string;
     status: ReleaseStatus;
     readinessScore: ReleaseConfidenceScore;
     gates: ReleaseGate[];

     // Domain methods
     create(version): void
     evaluateReadiness(context): void
     passGates(): boolean
     block(reason): void
   }
   ```

2. **Value Objects**:
   - `ReleaseConfidenceScore` - Aggregate of 4 pillars
     - Quality & Testing (QT): 40% weight
     - Bugs (B): 30% weight
     - Requirements & Planning (RP): 20% weight
     - Security & Ops (SO): 10% weight
   - `ReleaseGate` - Individual gate definition with threshold
   - `ReleaseStatus` - Enumeration

3. **Domain Events**:
   - `ReleaseCreated`
   - `ReleaseReadinessEvaluated`
   - `ReleaseReadinessAchieved`
   - `ReleaseBlocked`
   - `GatePassed`, `GateFailed` - Per-gate events

4. **Anti-Corruption Layer** - `ReleaseReadinessAdapter`
   - Query external contexts without exposing aggregates
   - Map Requirements, Bugs, TestRuns to read-only DTOs
   - Handle eventual consistency delays

---

### Task 3: Bug Aggregate (Week 2)

**Goal**: Create Bug bounded context aggregate root.

**Deliverables**:

1. **Bug Aggregate Root** - `/src/bugs/domain/bug.aggregate.ts`
   ```typescript
   class Bug implements AggregateRoot {
     id: string;
     title: string;
     severity: BugSeverity; // CRITICAL, HIGH, MEDIUM, LOW
     priority: BugPriority;
     status: BugStatus;

     // Domain methods
     create(title, severity): void
     triage(severity, priority): void
     assignTo(userId): void
     resolve(): void
     reopen(reason): void
   }
   ```

2. **Value Objects**:
   - `BugSeverity` - With RCS deduction rules
   - `BugPriority` - P0-P3 enumeration
   - `BugStatus` - NEW → RESOLVED lifecycle

3. **Domain Events**:
   - `BugCreated`
   - `BugTriaged`
   - `BugAssigned`
   - `BugResolved`
   - `BugReopened`

4. **Tests**: Severity and priority validation

---

### Task 4: TestRun Aggregate (Week 2)

**Goal**: Create Test Management bounded context with test execution aggregate.

**Deliverables**:

1. **TestRun Aggregate Root** - `/src/test-keys/domain/test-run.aggregate.ts`
   ```typescript
   class TestRun implements AggregateRoot {
     id: string;
     name: string;
     status: TestRunStatus;
     results: TestResult[];
     passRate: number;

     // Domain methods
     create(name): void
     recordResult(caseId, status, notes): void
     calculatePassRate(): void
     complete(): void
   }
   ```

2. **Value Objects**:
   - `PassRate` - Calculated percentage with validation
   - `TestRunStatus` - CREATED → RUNNING → COMPLETED
   - `TestResult` - Result of single test case

3. **Domain Events**:
   - `TestRunCreated`
   - `TestResultRecorded`
   - `TestRunCompleted`
   - `PassRateCalculated`

---

### Task 5: Domain Event Subscribers (Week 3)

**Goal**: Implement cross-context workflows using domain events.

**Deliverables**:

1. **Requirement Event Subscribers**:
   ```typescript
   // When RequirementApproved is published
   GenerateTasksOnRequirementApprovedHandler
     → Calls AI to generate tasks
     → Creates SprintItems
     → Publishes TasksGeneratedEvent

   RagIndexingOnRequirementCreatedHandler
     → Indexes requirement for semantic search
     → Handles indexing failures gracefully
   ```

2. **Sprint Event Subscribers**:
   ```typescript
   // When SprintStarted is published
   NotifyTeamOnSprintStartedHandler
     → Sends notifications to team members
     → Updates project roadmap

   CalculateVelocityOnSprintCompletedHandler
     → Computes sprint velocity
     → Updates historical metrics
   ```

3. **Release Event Subscribers**:
   ```typescript
   // When ReleaseReadinessEvaluated is published
   PublishReleaseMetricsHandler
     → Updates dashboards
     → Sends stakeholder notifications
   ```

4. **Bug Event Subscribers**:
   ```typescript
   // When BugTriaged is published
   UpdateReleaseRCSOnBugTriagedHandler
     → Recalculates RCS if bug linked to release
     → May trigger ReleaseBlocked event
   ```

---

### Task 6: Anti-Corruption Layers (Week 3-4)

**Goal**: Create adapters for cross-context communication without exposing internal models.

**Deliverables**:

1. **SprintAdapter** - `/src/sprints/infrastructure/adapters/requirements.adapter.ts`
   ```typescript
   @Injectable()
   class RequirementsAdapter {
     // Translate Requirement to SprintItem DTO
     async mapRequirementToSprintItem(reqId): Promise<SprintItemDTO>

     // Query approved requirements without exposing Requirement aggregate
     async getApprovedRequirements(): Promise<RequirementReadModel[]>
   }
   ```

2. **ReleaseAdapter** - `/src/releases/infrastructure/adapters/`
   ```typescript
   class RequirementsReadModel { /* read-only view */ }
   class BugsReadModel { /* read-only view */ }
   class TestsReadModel { /* read-only view */ }
   ```

3. **TestAutomationAdapter** - `/src/test-automation/infrastructure/adapters/test-keys.adapter.ts`
   ```typescript
   class TestCaseReadModel { /* read-only view */ }
   ```

---

### Task 7: Migrate Existing Services (Week 4-5)

**Goal**: Refactor services to use DDD patterns while maintaining backward compatibility.

**Deliverables**:

1. **Requirements Service Migration**
   - Create `RequirementApplicationService`
   - Leverage `Requirement` aggregate
   - Publish domain events
   - Inject `DomainEventPublisher`

2. **Sprints Service Migration**
   - Create `SprintApplicationService`
   - Use `Sprint` aggregate
   - Call adapter for Requirements

3. **Releases Service Migration**
   - Create `ReleaseApplicationService`
   - Use `Release` aggregate
   - Call anti-corruption layers

4. **Tests Service Migration**
   - Create `TestRunApplicationService`
   - Use `TestRun` aggregate

**Pattern**:
```typescript
// Before (procedural)
async createRequirement(dto: CreateRequirementDto) {
  const req = await this.repo.create(dto);
  await this.ragService.index(req); // imperative
  return req;
}

// After (DDD)
async createRequirement(dto: CreateRequirementDto) {
  const req = Requirement.create(dto); // aggregate creation
  await this.repo.save(req); // persist
  await this.eventPublisher.publishAll(req.getDomainEvents()); // events
  return req;
}
```

---

### Task 8: Event Store Foundation (Week 5-6)

**Goal**: Prepare for Event Sourcing by creating event persistence layer.

**Deliverables**:

1. **Event Store Entity** - `/src/common/domain/event-store.entity.ts`
   ```typescript
   class StoredDomainEvent {
     id: string;
     aggregateId: string;
     aggregateType: string;
     eventType: string;
     eventData: any; // Serialized DomainEvent
     tenantId: string;
     userId?: string;
     timestamp: Date;
     version: number; // Aggregate version at time of event
   }
   ```

2. **Event Store Service** - `/src/common/domain/event-store.service.ts`
   ```typescript
   @Injectable()
   class EventStoreService {
     async append(event: DomainEvent): Promise<void>
     async getEvents(aggregateId): Promise<DomainEvent[]>
     async getEventsSince(timestamp): Promise<DomainEvent[]>
     async getSnapshot(aggregateId): Promise<AggregateSnapshot>
   }
   ```

3. **Event Store Repository**
   - TypeORM repository for StoredDomainEvent
   - Indexes: aggregateId, eventType, timestamp, tenantId

4. **Tests**: Event append, retrieval, ordering

---

## Implementation Order

| Week | Task | Priority | Files | Tests |
|------|------|----------|-------|-------|
| 1 | Sprint Aggregate | HIGH | 3-4 | 8-10 |
| 1-2 | Release Aggregate | HIGH | 4-5 | 10-12 |
| 2 | Bug Aggregate | MEDIUM | 3 | 6-8 |
| 2 | TestRun Aggregate | MEDIUM | 3 | 6-8 |
| 3 | Event Subscribers | HIGH | 6-8 | 10-15 |
| 3-4 | Anti-Corruption Layers | HIGH | 4-5 | 8-10 |
| 4-5 | Service Migration | MEDIUM | 8-10 | 15-20 |
| 5-6 | Event Store | HIGH | 4-5 | 10-12 |

---

## File Structure

```
src/common/domain/
├── aggregate-root.interface.ts ✅ (Phase 2)
├── domain-event.publisher.ts ✅ (Phase 2)
├── event-store.entity.ts (NEW)
├── event-store.service.ts (NEW)
├── DDD_ARCHITECTURE.md ✅ (Phase 2)
└── PHASE_3_ROADMAP.md (THIS FILE)

src/sprints/domain/
├── sprint.aggregate.ts (NEW)
├── value-objects/
│   ├── sprint-status.vo.ts (NEW)
│   ├── sprint-capacity.vo.ts (NEW)
│   └── velocity.vo.ts (NEW)
└── events/
    ├── sprint-created.event.ts (NEW)
    ├── sprint-started.event.ts (NEW)
    ├── item-added.event.ts (NEW)
    └── sprint-completed.event.ts (NEW)

src/releases/domain/
├── release.aggregate.ts (NEW)
├── value-objects/
│   ├── release-confidence-score.vo.ts (NEW)
│   └── release-gate.vo.ts (NEW)
└── events/
    ├── release-readiness-calculated.event.ts (NEW)
    └── release-blocked.event.ts (NEW)

src/releases/infrastructure/adapters/
├── requirements.adapter.ts (NEW)
├── bugs.adapter.ts (NEW)
└── tests.adapter.ts (NEW)

src/bugs/domain/
├── bug.aggregate.ts (NEW)
├── value-objects/
│   ├── bug-severity.vo.ts (NEW)
│   └── bug-status.vo.ts (NEW)
└── events/
    ├── bug-created.event.ts (NEW)
    └── bug-triaged.event.ts (NEW)

src/test-keys/domain/
├── test-run.aggregate.ts (NEW)
└── events/
    ├── test-run-created.event.ts (NEW)
    └── test-result-recorded.event.ts (NEW)

src/common/application/
├── handlers/ (NEW)
│   ├── generate-tasks-on-requirement-approved.handler.ts
│   ├── index-rag-on-requirement-created.handler.ts
│   ├── notify-team-on-sprint-started.handler.ts
│   ├── update-release-rcs-on-bug-triaged.handler.ts
│   └── ... (8-10 handlers)
└── adapters/ (NEW)
    ├── requirements.adapter.ts
    ├── bugs.adapter.ts
    └── tests.adapter.ts
```

---

## Success Criteria

### Code Quality
- [ ] All aggregates have unit tests (>80% coverage)
- [ ] All value objects are immutable and self-validating
- [ ] All domain events are published from aggregates
- [ ] No circular dependencies between contexts
- [ ] Anti-corruption layers shield domain models

### Architecture
- [ ] 5 aggregate roots fully implemented
- [ ] 8+ domain event subscribers working
- [ ] Event store persisting all events
- [ ] Event-driven workflows functional
- [ ] No breaking changes to existing APIs

### Testing
- [ ] Unit tests: 200+ new tests
- [ ] Integration tests: Event subscribers verified
- [ ] E2E tests: 21 passing (from Phase 2)
- [ ] Event sourcing tests: Event ordering verified

### Documentation
- [ ] DDD_ARCHITECTURE.md complete
- [ ] PHASE_3_ROADMAP.md (this file) complete
- [ ] Code comments for complex domain logic
- [ ] Example event subscription patterns

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Services tightly coupled to aggregates | HIGH | Use dependency injection for repos/services |
| Event publishing failures | MEDIUM | Async handlers with retry logic + dead letter queue |
| Circular dependencies | MEDIUM | Explicit bounded context boundaries + adapters |
| Large aggregates | LOW | Keep aggregates small, use child entities |
| Event versioning | MEDIUM | Version events, use migration handlers |

---

## Next Steps (After Phase 3)

### Phase 4: CQRS Implementation
- Separate read and write models
- Materialized views for queries
- Async projection updaters

### Phase 5: Event Sourcing
- Replace traditional persistence with event store
- Aggregate reconstruction from events
- Temporal queries (state at any point in time)

### Phase 6: Messaging & Distribution
- Kafka/RabbitMQ for inter-service communication
- Saga pattern for distributed transactions
- Outbox pattern for guaranteed event publishing

---

## References

- [DDD in NestJS](https://docs.nestjs.com/recipes/ddd)
- [Domain Events by Vaughn Vernon](https://vaughnvernon.com/portfolio/domain-events/)
- [Event Sourcing Pattern](https://martinfowler.com/eaaDev/EventSourcing.html)
