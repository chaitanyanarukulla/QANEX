# Domain-Driven Design (DDD) Architecture

This document outlines the DDD implementation in QANexus, establishing bounded contexts, aggregates, value objects, and domain events for the core business domains.

## Overview

QANexus implements DDD principles to create a maintainable, scalable, and business-focused architecture. The system is organized into distinct **bounded contexts**, each with clear responsibilities and explicit boundaries.

## Core Concepts

### Aggregate Root
- **Definition**: An entity that is the entry point to an aggregate
- **Responsibility**: Maintains invariants and coordinates changes within the aggregate
- **Implementation**: Extends `BaseDomainAggregate` or implements `AggregateRoot` interface
- **Location**: Each bounded context defines its own aggregate root

**Example**: `Requirement` is the aggregate root for the Requirements Management context

### Value Object
- **Definition**: Immutable objects that have no unique identity and are compared by value
- **Characteristics**:
  - Immutable after creation
  - No unique identifier
  - Compared by value, not reference
  - Self-validating (enforces invariants in constructor)
- **Location**: `/src/{context}/domain/value-objects/`

**Example**: `RQSScore` is a value object representing requirement quality metrics

### Domain Event
- **Definition**: Something that happened in the domain and is of interest to the business
- **Purpose**:
  - Decouple bounded contexts
  - Enable eventual consistency
  - Create audit trail
  - Trigger downstream workflows
- **Implementation**: Implements `DomainEvent` interface
- **Location**: `/src/{context}/domain/events/`

**Example**: `RequirementApproved` is published when a requirement enters APPROVED state

### Bounded Context
- **Definition**: Explicit boundaries within which a domain model is valid
- **Characteristic**: Has its own ubiquitous language and models
- **Communication**: Bounded contexts interact through events and explicit APIs

## Bounded Contexts

### 1. Requirements Management Context

**Location**: `/src/requirements/`

**Purpose**: Manage requirement specifications, analysis, and quality assessment.

#### Aggregate Root: Requirement

```typescript
class Requirement implements AggregateRoot {
  id: string;
  title: string;
  content: string;
  state: RequirementState; // DRAFT → PUBLISHED → APPROVED → READY
  priority: RequirementPriority;
  type: RequirementType;
  acceptanceCriteria: AcceptanceCriteria[];
  rqsScore: RQSScore; // Value Object
  tenantId: string;
  sourceDocumentId?: string;

  // Domain Methods (encapsulate business logic)
  approve(userId: string): void {
    if (this.state !== RequirementState.DRAFT) {
      throw new InvalidStateTransitionError(...);
    }
    this.state = RequirementState.APPROVED;
    this.addDomainEvent(new RequirementApproved(...));
  }

  analyzeQuality(rqsScore: RQSScore): void {
    this.rqsScore = rqsScore;
    this.addDomainEvent(new RequirementAnalyzed(...));
  }
}
```

#### Value Objects:
- **RQSScore**: Requirement Quality Score assessment
  - `score`: Overall quality (0-100)
  - `clarity`, `completeness`, `testability`, `consistency`: Dimension scores
  - Methods: `isHighQuality()`, `getWeakestDimension()`, `equals()`

- **RequirementState**: Enumeration of valid states
  - DRAFT → PUBLISHED → APPROVED → READY → BACKLOGGED → COMPLETED

#### Domain Events:
- **RequirementCreated**: Fired when requirement is first created
  - Subscribers: RAG Indexing, Audit Trail, Initial Analysis Trigger

- **RequirementApproved**: Fired when requirement reaches APPROVED state
  - Subscribers: Task Generation, Notifications, Project Roadmap Update

- **RequirementAnalyzed**: Fired when AI analysis completes
  - Subscribers: Quality Gate Checks, Team Notifications

- **TasksGenerated**: Fired when tasks are created from requirement
  - Subscribers: Sprint Recommendations, Capacity Planning

#### Invariants Maintained:
- A requirement can only be approved once
- Acceptance criteria cannot be empty for APPROVED requirements
- RQS score must be >= 60 for approval

#### Repository:
```typescript
interface RequirementRepository extends Repository<Requirement> {
  findByIdAndTenant(id: string, tenantId: string): Promise<Requirement>;
  findAllByTenant(tenantId: string): Promise<Requirement[]>;
  findApprovedRequirements(tenantId: string): Promise<Requirement[]>;
}
```

---

### 2. Sprint Planning Context

**Location**: `/src/sprints/`

**Purpose**: Manage sprint planning, capacity, and task execution.

#### Aggregate Root: Sprint

```typescript
class Sprint implements AggregateRoot {
  id: string;
  name: string;
  status: SprintStatus; // PLANNED → ACTIVE → COMPLETED
  startDate: Date;
  endDate: Date;
  capacity: number; // Story points
  items: SprintItem[]; // Part of aggregate
  tenantId: string;

  // Domain Methods
  addItem(item: SprintItem): void {
    if (this.status !== SprintStatus.PLANNED) {
      throw new SprintAlreadyStartedError();
    }
    if (this.getCurrentCapacity() + item.storyPoints > this.capacity) {
      throw new CapacityExceededError();
    }
    this.items.push(item);
    this.addDomainEvent(new SprintItemAdded(...));
  }

  start(): void {
    this.status = SprintStatus.ACTIVE;
    this.addDomainEvent(new SprintStarted(...));
  }
}
```

#### Child Entity: SprintItem

```typescript
class SprintItem {
  id: string;
  sprintId: string;
  title: string;
  status: SprintItemStatus; // TODO → IN_PROGRESS → DONE
  priority: SprintItemPriority;
  type: SprintItemType; // FEATURE, BUG, TASK
  storyPoints: number;
  requirementId?: string; // Link to Requirements context
  assigneeId?: string;
}
```

#### Value Objects:
- **SprintStatus**: PLANNED, ACTIVE, COMPLETED
- **SprintCapacity**: Manages total available story points
- **Velocity**: Historical sprint completion rate

#### Domain Events:
- **SprintCreated**: New sprint initialized
- **SprintStarted**: Sprint moved to ACTIVE
- **SprintCompleted**: Sprint finished
- **ItemStatusChanged**: Task status updated

#### Anti-Corruption Layer:
- **To Requirements**: Maps `SprintItem.requirementId` without loading full Requirement aggregate
- Uses queries/DTOs instead of direct entity references

---

### 3. Test Management Context

**Location**: `/src/test-keys/`, `/src/test-automation/`

**Purpose**: Manage test cases, test execution, and test automation.

#### Two Aggregate Roots:

**TestRun** (test execution context):
```typescript
class TestRun implements AggregateRoot {
  id: string;
  name: string;
  status: TestRunStatus; // CREATED → RUNNING → COMPLETED
  results: TestResult[];
  passRate: number;
  tenantId: string;

  recordResult(caseId: string, status: TestStatus, notes?: string): void {
    const result = new TestResult(caseId, status, notes);
    this.results.push(result);
    this.updatePassRate();
    this.addDomainEvent(new TestResultRecorded(...));
  }
}
```

**AutomationCandidate** (test automation context):
```typescript
class AutomationCandidate implements AggregateRoot {
  id: string;
  testCaseId: string;
  status: AutomationStatus; // CANDIDATE → IN_PROGRESS → GENERATED → MERGED
  prNumber?: string;
  generatedCode?: string;
  tenantId: string;

  generateCode(aiProvider: AiProvider): void {
    this.generatedCode = await aiProvider.generateTestCode(...);
    this.status = AutomationStatus.GENERATED;
    this.addDomainEvent(new TestCodeGenerated(...));
  }
}
```

#### Anti-Corruption Layer:
- **TestKeys → TestAutomation**: Via `AutomationCandidateService`
- Does not expose TestCase entity to TestAutomation context
- Uses events for cross-context communication

---

### 4. Release Management Context

**Location**: `/src/releases/`

**Purpose**: Manage releases and calculate release readiness.

#### Aggregate Root: Release

```typescript
class Release implements AggregateRoot {
  id: string;
  version: string;
  status: ReleaseStatus;
  environment: string;
  readinessScore: ReleaseConfidenceScore; // Value Object
  tenantId: string;

  evaluateReadiness(context: ReleaseReadinessContext): void {
    const score = this.calculateRCS(context);
    this.readinessScore = score;

    if (score.passesGates()) {
      this.status = ReleaseStatus.READY;
      this.addDomainEvent(new ReleaseReadinessAchieved(...));
    }
  }
}
```

#### Value Objects:
- **ReleaseConfidenceScore (RCS)**: Aggregate scoring model
  ```typescript
  class ReleaseConfidenceScore implements ValueObject {
    totalScore: number; // 0-100
    qt: number; // Quality & Testing (0-100, 40% weight)
    b: number;  // Bugs (0-100, 30% weight)
    rp: number; // Requirements & Planning (0-100, 20% weight)
    so: number; // Security & Ops (0-100, 10% weight)

    calculateTotal(): number {
      return (this.qt * 0.4) + (this.b * 0.3) + (this.rp * 0.2) + (this.so * 0.1);
    }

    passesGates(): boolean {
      return this.totalScore >= 75 && this.hasNoCriticalBugs();
    }
  }
  ```

#### Release Gates (Invariants):
- RCS Score >= 75
- Zero critical bugs
- Test coverage >= 80%
- Requirements readiness >= 90% (recommended)

#### Domain Events:
- **ReleaseCreated**: New release initialized
- **ReleaseReadinessCalculated**: RCS computation completed
- **ReleaseReadinessAchieved**: All gates passed
- **ReleaseBlocked**: Critical issues preventing release

#### Anti-Corruption Layer:
Since Release context aggregates data from multiple bounded contexts, use:
- **Query Services**: `ReleaseReadinessQueryService`
- **Read Models**: Materialized views of Requirements, Bugs, Test results
- **Events**: Subscribe to domain events from other contexts

---

### 5. Bug Management Context

**Location**: `/src/bugs/`

**Purpose**: Track bugs and manage bug lifecycle.

#### Aggregate Root: Bug

```typescript
class Bug implements AggregateRoot {
  id: string;
  title: string;
  severity: BugSeverity; // CRITICAL, HIGH, MEDIUM, LOW
  priority: BugPriority; // P0, P1, P2, P3
  status: BugStatus; // NEW → TRIAGED → IN_PROGRESS → RESOLVED
  linkedRequirementId?: string;
  linkedTestRunId?: string;
  tenantId: string;

  triage(severity: BugSeverity, priority: BugPriority): void {
    this.severity = severity;
    this.priority = priority;
    this.status = BugStatus.TRIAGED;
    this.addDomainEvent(new BugTriaged(...));
  }
}
```

#### Value Objects:
- **BugSeverity**: Enumeration with impact deduction rules
  - CRITICAL: -40 RCS points
  - HIGH: -20 RCS points
  - MEDIUM: -10 RCS points
  - LOW: -2 RCS points

---

## Domain Event System

### Architecture

```
Aggregate Root
    ↓
  (business logic called)
    ↓
addDomainEvent(event)
    ↓
  (aggregate saved to database)
    ↓
publishAll(events) via DomainEventPublisher
    ↓
Event Subscribers handle events asynchronously
```

### Example Implementation

```typescript
// 1. Service creates aggregate and applies business logic
const requirement = new Requirement(id, title, tenantId);
requirement.approve(userId);  // <- Adds RequirementApproved event

// 2. Save aggregate to database
const saved = await this.repo.save(requirement);

// 3. Publish domain events
await this.eventPublisher.publishAll(requirement.getDomainEvents());
requirement.clearDomainEvents();
```

### Subscriber Pattern

```typescript
@Injectable()
export class GenerateTasksOnRequirementApprovedHandler
  implements DomainEventSubscriber {

  async handle(event: RequirementApproved): Promise<void> {
    // Generate tasks when requirement is approved
    const requirement = await this.repo.findById(event.requirementId);
    const tasks = await this.aiProvider.generateTasks(requirement);
    // ... save tasks
  }

  isSubscribedTo(event: DomainEvent): boolean {
    return event.eventType === 'RequirementApproved';
  }
}

// Register in module
@Module({
  providers: [
    DomainEventPublisher,
    GenerateTasksOnRequirementApprovedHandler,
    // ... other handlers
  ],
})
export class DomainModule {
  constructor(
    eventPublisher: DomainEventPublisher,
    handler: GenerateTasksOnRequirementApprovedHandler,
  ) {
    eventPublisher.subscribe(handler);
  }
}
```

## Communication Between Bounded Contexts

### 1. Synchronous (via API/Service Calls)
- Used for immediate validation
- Example: Check available sprints when assigning requirement

### 2. Asynchronous (via Domain Events)
- Used for eventual consistency
- Example: Requirement approved → trigger task generation

### 3. Anti-Corruption Layer
- Translate between context models
- Prevent direct entity references
- Example: `SprintAdapter` translates between Sprint and Requirement contexts

```typescript
@Injectable()
export class SprintAdapter {
  // Translate from Requirements context to Sprint context
  async getRequirementForSprint(
    requirementId: string,
    tenantId: string,
  ): Promise<SprintItemDTO> {
    const requirement = await this.requirementService.findOne(
      requirementId,
      tenantId,
    );
    return {
      title: requirement.title,
      description: requirement.content,
      priority: requirement.priority,
      type: 'FEATURE',
    };
  }
}
```

## File Organization

```
src/
├── common/
│   └── domain/
│       ├── aggregate-root.interface.ts (AggregateRoot, DomainEvent, ValueObject)
│       ├── domain-event.publisher.ts (Event bus)
│       └── DDD_ARCHITECTURE.md (this file)
│
├── requirements/
│   └── domain/
│       ├── requirement.aggregate.ts (Aggregate root implementation)
│       ├── value-objects/
│       │   ├── rqs-score.vo.ts (RQS Score value object)
│       │   └── requirement-state.vo.ts (State enumeration)
│       └── events/
│           ├── requirement-created.event.ts
│           ├── requirement-approved.event.ts
│           ├── requirement-analyzed.event.ts
│           └── tasks-generated.event.ts
│
├── sprints/
│   └── domain/
│       ├── sprint.aggregate.ts
│       ├── sprint-item.entity.ts
│       └── events/
│           ├── sprint-created.event.ts
│           └── sprint-started.event.ts
│
├── releases/
│   └── domain/
│       ├── release.aggregate.ts
│       ├── value-objects/
│       │   └── release-confidence-score.vo.ts
│       └── events/
│           ├── release-readiness-calculated.event.ts
│           └── release-blocked.event.ts
│
└── bugs/
    └── domain/
        ├── bug.aggregate.ts
        └── value-objects/
            └── bug-severity.vo.ts
```

## Next Steps

### Phase 1 (Current): Foundation
- ✅ Create `AggregateRoot` interface and `BaseDomainAggregate` base class
- ✅ Create `DomainEvent` interface and `DomainEventPublisher` service
- ✅ Create `RQSScore` value object for Requirements context
- ✅ Create domain events: `RequirementCreated`, `RequirementApproved`

### Phase 2: Implementation
- Create remaining value objects (ReleaseConfidenceScore, BugSeverity)
- Create remaining domain events for all contexts
- Migrate existing services to use aggregates and events
- Implement domain event subscribers
- Add anti-corruption layer translators

### Phase 3: Advanced Features
- Event sourcing for audit trail
- CQRS pattern for read models
- Saga pattern for long-running workflows
- Message queue for async processing

## Key Benefits

1. **Business-Focused Code**: Domain logic is explicit and testable
2. **Decoupled Contexts**: Bounded contexts can evolve independently
3. **Eventual Consistency**: Domains sync through events, not tight coupling
4. **Audit Trail**: All domain events provide complete history
5. **Scalability**: Event-based architecture supports horizontal scaling
6. **Maintainability**: Clear boundaries make code easier to understand
7. **Testability**: Aggregates and value objects are unit-testable

## References

- Eric Evans - "Domain-Driven Design: Tackling Complexity in the Heart of Software"
- Vaughn Vernon - "Implementing Domain-Driven Design"
- [Microsoft: Domain Events](https://learn.microsoft.com/en-us/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/domain-events-design-implementation)
