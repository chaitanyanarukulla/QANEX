# [LEGACY - Historical Record Only] Service Migration Guide - DDD & Event Store Integration

⚠️ **This document is archived for historical reference and no longer reflects the current system design.**

For current architecture details, see: [../ARCHITECTURE.md](../ARCHITECTURE.md)

---

**Status**: Phase 3 Completion (90% → 95%)
**Duration**: Weeks 6-7
**Objective**: Migrate existing services to use DDD aggregates and Event Store

---

## Overview

This guide describes how to migrate QANexus services from traditional CRUD pattern to Domain-Driven Design (DDD) aggregates with event-driven architecture.

### Migration Phases

1. **Phase A**: RequirementsService migration (Week 6)
2. **Phase B**: SprintsService migration (Week 6)
3. **Phase C**: ReleasesService migration (Week 7)

Each migration is **independent and backward compatible**, allowing gradual rollout without breaking existing APIs.

---

## Architecture Pattern

### Before: Traditional CRUD Service

```typescript
// Old approach
async create(dto: CreateRequirementDto): Promise<Requirement> {
  const req = this.repo.create(dto);
  return this.repo.save(req);
  // No events, no audit trail, no business logic encapsulation
}
```

### After: DDD with Event Store

```typescript
// New approach
async create(dto: CreateRequirementDto): Promise<Requirement> {
  // 1. Create aggregate (with validation)
  const aggregate = RequirementAggregate.create(dto);

  // 2. Save entity
  const entity = this.repo.create(aggregate);
  const saved = await this.repo.save(entity);

  // 3. Publish events (persisted to EventStore)
  await this.eventStorePublisher.publishAll(
    aggregate.getDomainEvents(),
    tenantId,
  );

  return saved;
}
```

### Key Improvements

| Aspect | Before | After |
|--------|--------|-------|
| **Validation** | In DTO only | Aggregate enforces |
| **Business Logic** | Scattered across service | Encapsulated in aggregate |
| **State Changes** | Implicit | Explicit via events |
| **Audit Trail** | Manual logging | Complete event log |
| **Side-Effects** | Hard-coded in service | Decoupled via subscribers |
| **Testing** | Integration heavy | Unit testable aggregates |

---

## RequirementsService Migration

### Files Involved

**Created**:
- `/apps/api/src/requirements/domain/requirement.aggregate.ts` - Requirement aggregate (700+ lines)
- `/apps/api/src/requirements/domain/events/requirement-created.event.ts` - Domain event
- `/apps/api/src/requirements/domain/events/requirement-approved.event.ts` - Domain event
- `/apps/api/src/requirements/domain/events/requirement-analyzed.event.ts` - Domain event
- `/apps/api/src/requirements/domain/events/requirement-backlogged.event.ts` - Domain event
- `/apps/api/src/requirements/domain/events/requirement-updated.event.ts` - Domain event
- `/apps/api/src/requirements/requirements.service.refactored.ts` - New implementation (reference)

**Modified**:
- `/apps/api/src/requirements/requirements.service.ts` - Apply refactored logic (in-place migration)
- `/apps/api/src/requirements/requirements.module.ts` - Add EventStoreModule import

### Step-by-Step Migration

#### Step 1: Import Dependencies

```typescript
// requirements.module.ts
import { EventStoreModule } from '../common/event-store/event-store.module';
import { DomainModule } from '../common/domain/domain.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Requirement, SprintItem]),
    EventStoreModule,  // Add this
    DomainModule,      // Add this
    // ... other imports
  ],
  providers: [RequirementsService],
})
export class RequirementsModule {}
```

#### Step 2: Update Service Constructor

```typescript
// Before
constructor(
  @InjectRepository(Requirement) private repo: Repository<Requirement>,
  @InjectRepository(SprintItem) private sprintItemRepo: Repository<SprintItem>,
  private ragService: RagService,
  private aiFactory: AiProviderFactory,
) {}

// After
constructor(
  @InjectRepository(Requirement) private repo: Repository<Requirement>,
  @InjectRepository(SprintItem) private sprintItemRepo: Repository<SprintItem>,
  private ragService: RagService,
  private aiFactory: AiProviderFactory,
  private eventStorePublisher: EventStorePublisher,  // Add
  private eventPublisher: DomainEventPublisher,      // Add
) {}
```

#### Step 3: Update `create()` Method

```typescript
// Use aggregate to validate and create events
async create(createDto: CreateRequirementDto, user: IAuthUser): Promise<Requirement> {
  const { tasks, ...reqData } = createDto;

  // 1. Create aggregate (validates inputs)
  const aggregate = RequirementAggregate.create({
    title: reqData.title,
    content: reqData.content,
    priority: reqData.priority || 'MEDIUM',
    type: reqData.type || 'FUNCTIONAL',
    acceptanceCriteria: reqData.acceptanceCriteria || [],
    tenantId: user.tenantId,
  });

  // 2. Save entity
  const requirement = this.repo.create({
    id: aggregate.id,
    ...reqData,
    tenantId: user.tenantId,
  });
  const saved = await this.repo.save(requirement);

  // 3. Publish events (automatically persisted to EventStore)
  await this.eventStorePublisher.publishAll(
    aggregate.getDomainEvents(),
    user.tenantId,
  );
  aggregate.clearDomainEvents();

  // 4. Create tasks if provided
  if (tasks && tasks.length > 0) {
    await this.addTasks(saved.id, tasks as TaskDto[], user.tenantId);
  }

  // 5. Background indexing
  this.ragService.indexRequirement(...).catch(e => {
    this.logger.error('RAG Index failed', { error: e?.message });
  });

  return saved;
}
```

#### Step 4: Update `update()` Method

```typescript
async update(
  id: string,
  updateDto: UpdateRequirementDto,
  user: IAuthUser,
): Promise<Requirement> {
  const requirement = await this.findOne(id, user.tenantId);

  // 1. Reconstruct aggregate
  const aggregate = this.reconstructAggregate(requirement);

  // 2. Apply updates to aggregate
  aggregate.update({
    title: updateDto.title,
    content: updateDto.content,
    priority: updateDto.priority,
    type: updateDto.type,
    acceptanceCriteria: updateDto.acceptanceCriteria,
  });

  // 3. Update entity
  Object.assign(requirement, updateDto);
  const saved = await this.repo.save(requirement);

  // 4. Publish events
  if (aggregate.getDomainEvents().length > 0) {
    await this.eventStorePublisher.publishAll(
      aggregate.getDomainEvents(),
      user.tenantId,
    );
    aggregate.clearDomainEvents();
  }

  return saved;
}
```

#### Step 5: Add New Methods

```typescript
// Approve requirement
async approve(id: string, tenantId: string): Promise<Requirement> {
  const requirement = await this.findOne(id, tenantId);
  const aggregate = this.reconstructAggregate(requirement);

  aggregate.approve(); // Publishes RequirementApproved event

  requirement.state = RequirementState.APPROVED;
  const saved = await this.repo.save(requirement);

  await this.eventStorePublisher.publishAll(
    aggregate.getDomainEvents(),
    tenantId,
  );

  return saved;
}

// Helper: Reconstruct aggregate from entity
private reconstructAggregate(entity: Requirement): RequirementAggregate {
  return RequirementAggregate.recreate({
    id: entity.id,
    title: entity.title,
    content: entity.content,
    status: entity.state,
    priority: entity.priority,
    type: entity.type,
    acceptanceCriteria: entity.acceptanceCriteria || [],
    rqs: entity.rqs,
    tenantId: entity.tenantId,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  });
}
```

#### Step 6: Update `analyze()` Method

```typescript
async analyze(id: string, tenantId: string): Promise<Requirement> {
  const requirement = await this.findOne(id, tenantId);
  const { provider } = await this.aiFactory.getProvider(tenantId);

  // Perform analysis
  const analysis = await provider.analyzeRequirement(
    requirement.content || requirement.title,
  );

  // Reconstruct and apply analysis to aggregate
  const aggregate = this.reconstructAggregate(requirement);
  aggregate.applyAnalysis(analysis);

  // Update entity
  requirement.rqs = analysis;
  const saved = await this.repo.save(requirement);

  // Publish events
  await this.eventStorePublisher.publishAll(
    aggregate.getDomainEvents(),
    tenantId,
  );

  return saved;
}
```

---

## Event Subscribers to Create

After service migration, create subscribers for each event:

### RequirementCreated Subscriber

```typescript
@Injectable()
export class RequirementCreatedSubscriber implements DomainEventSubscriber {
  constructor(
    private ragService: RagService,
    private notificationService: NotificationService,
  ) {}

  async handle(event: RequirementCreated): Promise<void> {
    // 1. Index in RAG
    await this.ragService.indexRequirement(
      event.aggregateId,
      event.tenantId,
      event.title,
      event.content,
    );

    // 2. Notify team leads
    await this.notificationService.notifyNewRequirement(event);
  }

  isSubscribedTo(event: DomainEvent): boolean {
    return event.eventType === 'RequirementCreated';
  }
}
```

### RequirementApproved Subscriber

```typescript
@Injectable()
export class RequirementApprovedSubscriber implements DomainEventSubscriber {
  constructor(private taskGenerationService: TaskGenerationService) {}

  async handle(event: RequirementApproved): Promise<void> {
    // Auto-generate tasks when requirement approved
    await this.taskGenerationService.generateTasks(
      event.aggregateId,
      event.tenantId,
    );
  }

  isSubscribedTo(event: DomainEvent): boolean {
    return event.eventType === 'RequirementApproved';
  }
}
```

---

## Migration Checklist

### RequirementsService

- [ ] Create `requirement.aggregate.ts` (700+ lines)
- [ ] Create 5 domain events (requirement-*.event.ts)
- [ ] Update `requirements.service.ts` with aggregate usage
- [ ] Update `requirements.module.ts` imports
- [ ] Create unit tests for aggregate (80%+ coverage)
- [ ] Create unit tests for service (updated methods)
- [ ] Test backward compatibility with existing APIs
- [ ] Deploy to staging and validate
- [ ] Create event subscribers
- [ ] Deploy to production

### SprintsService (Similar Pattern)

- [ ] Create `sprint.aggregate.ts`
- [ ] Create domain events
- [ ] Update service with aggregate usage
- [ ] Create tests
- [ ] Deploy

### ReleasesService (Similar Pattern)

- [ ] Create `release.aggregate.ts`
- [ ] Create domain events
- [ ] Update service with aggregate usage
- [ ] Create tests
- [ ] Deploy

---

## Testing Strategy

### Unit Tests for Aggregate

```typescript
describe('Requirement Aggregate', () => {
  it('should create requirement with initial event', () => {
    const req = RequirementAggregate.create({
      title: 'Add auth',
      content: 'Implement OAuth',
      tenantId: 'tenant-1',
    });

    expect(req.getDomainEvents()).toHaveLength(1);
    expect(req.getDomainEvents()[0].eventType).toBe('RequirementCreated');
  });

  it('should approve requirement', () => {
    const req = RequirementAggregate.recreate({
      id: 'req-1',
      title: 'Add auth',
      content: 'Implement OAuth',
      status: 'READY',
      priority: 'HIGH',
      type: 'FEATURE',
      acceptanceCriteria: [],
      tenantId: 'tenant-1',
      rqs: { score: 85, clarity: 90, completeness: 80, testability: 80, consistency: 85, feedback: [] },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    req.approve();

    expect(req.status).toBe('APPROVED');
    expect(req.getDomainEvents()).toHaveLength(1);
    expect(req.getDomainEvents()[0].eventType).toBe('RequirementApproved');
  });
});
```

### Integration Tests for Service

```typescript
describe('RequirementsService (Migrated)', () => {
  it('should publish events when creating requirement', async () => {
    const publishSpy = jest.spyOn(eventStorePublisher, 'publishAll');

    await service.create(
      { title: 'Add auth', content: 'OAuth' },
      { tenantId: 'tenant-1', id: 'user-1' },
    );

    expect(publishSpy).toHaveBeenCalled();
  });

  it('should maintain backward compatibility with entity structure', async () => {
    const requirement = await service.create(dto, user);

    expect(requirement.id).toBeDefined();
    expect(requirement.title).toBe(dto.title);
    expect(requirement.state).toBe('DRAFT');
  });
});
```

---

## Backward Compatibility

### API Endpoints Unchanged

All existing REST endpoints continue to work without modification:

```
POST /requirements         → Create (now publishes events)
GET  /requirements         → List
GET  /requirements/:id     → Get one
PUT  /requirements/:id     → Update (now publishes events)
DELETE /requirements/:id   → Delete
POST /requirements/:id/analyze → Analyze (now publishes events)
POST /requirements/:id/generate-tasks → Generate tasks
POST /requirements/:id/move-tasks-backlog → Move to backlog
```

### Entity Response Format

API responses remain identical:

```typescript
// Before and after: same response structure
{
  id: "req-123",
  title: "Add authentication",
  content: "Implement OAuth 2.0",
  state: "DRAFT",
  priority: "HIGH",
  type: "FEATURE",
  acceptanceCriteria: [...],
  rqs: { score: 85, ... },
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z"
}
```

---

## Deployment Strategy

### Option 1: Blue-Green (Recommended)

1. Deploy new migrated service to green environment
2. Run both services in parallel (old and new)
3. Route 10% of traffic to new service
4. Monitor metrics and error rates
5. Gradually increase traffic: 10% → 50% → 100%
6. Rollback capability if issues detected

### Option 2: Canary

1. Deploy migrated service to canary pool (5% of users)
2. Monitor closely for 24 hours
3. If stable, increase to 20%
4. If stable, increase to 100%

### Option 3: Feature Flag (Safest)

```typescript
// In service constructor
if (this.featureFlags.isDDDEnabled('requirements')) {
  // Use new aggregate-based logic
  this.useAggregate = true;
} else {
  // Use old CRUD logic
  this.useAggregate = false;
}

// In create() method
async create(dto, user) {
  if (this.useAggregate) {
    // New aggregate path
  } else {
    // Old entity path
  }
}
```

---

## Monitoring & Metrics

### Key Metrics to Track

```typescript
// Event publishing rate
this.metrics.publishEvents++;

// Event processing success rate
this.metrics.subscriberSuccess++;
this.metrics.subscriberError++;

// EventStore persistence time
const duration = Date.now() - startTime;
this.metrics.eventStoreLatency.observe(duration);

// Domain logic execution time
const aggregateTime = Date.now() - aggregateStart;
this.metrics.aggregateLatency.observe(aggregateTime);
```

### Alert Conditions

- If event publishing fails > 1% of requests
- If EventStore latency > 500ms
- If subscriber processing > 1 second
- If service response time increases > 50%

---

## Rollback Plan

If issues detected:

```bash
# 1. Revert to old service
git revert <migration-commit>

# 2. Feature flag off
featureFlags.set('requirements-ddd', false)

# 3. Clear event subscribers
eventPublisher.unsubscribeAll()

# 4. Restart service
npm run start

# 5. Monitor for stability
```

Events published before rollback are persisted in EventStore (audit trail preserved).

---

## FAQ

**Q: Will existing APIs break?**
A: No, all APIs remain 100% backward compatible.

**Q: What if events fail to publish?**
A: Errors are logged, but entity is still saved. Subscribers are notified asynchronously.

**Q: Can we roll back?**
A: Yes, feature flag provides instant rollback. EventStore preserves history.

**Q: How do we handle old data?**
A: Existing entities work as-is. New entities publish events. Gradual migration.

**Q: What about performance?**
A: Event publishing adds ~50-100ms (negligible for most APIs). Aggregate creation is fast (<5ms).

---

## Timeline

**Week 6 (Days 1-3)**: RequirementsService migration
**Week 6 (Days 4-5)**: Testing & validation
**Week 7 (Days 1-3)**: SprintsService migration
**Week 7 (Days 4-5)**: ReleasesService migration
**Week 7 (Days 6-7)**: Final validation & documentation

---

## Next Steps After Migration

1. **Event Projections**: Create read models from events
2. **CQRS**: Separate read and write models
3. **Sagas**: Distributed transaction handling
4. **Event Subscriptions**: Real-time updates via WebSockets
5. **Complete Event Sourcing**: Rebuild state from events only
