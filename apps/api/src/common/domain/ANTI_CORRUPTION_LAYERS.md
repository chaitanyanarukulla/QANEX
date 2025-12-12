# Anti-Corruption Layers (ACL) Documentation

## Overview

Anti-Corruption Layers (ACLs) are translation layers between bounded contexts that prevent domain models from being polluted by external dependencies. They shield aggregates from schema changes in other contexts.

## Why Anti-Corruption Layers Matter

### Problem Without ACLs
```typescript
// ❌ BAD: Release aggregate knows all about Requirements details
const requirements = await requirementsService.findAll(tenantId);
const approved = requirements.filter(r => r.approved === true); // Tight coupling
const readiness = (approved.length / requirements.length) * 100;
```

Issues:
- Release aggregate depends on Requirements schema
- Changes to Requirements break Release
- Hard to test Release independently
- Circular dependencies risk

### Solution With ACLs
```typescript
// ✅ GOOD: ReleaseReadinessAdapter shields Release from Requirements
const readinessData = await releaseReadinessAdapter.getReadinessData(tenantId);
const readiness = readinessData.requirementsReadinessPercentage;
```

Benefits:
- Clean boundary between contexts
- Requirements changes don't break Release
- Easy to mock for testing
- Clear data contract via DTOs

## Implemented Anti-Corruption Layers

### 1. ReleaseReadinessAdapter

**Purpose**: Aggregate readiness data from 4 contexts for Release evaluation

**Contexts Bridged**:
- Requirements → requirements readiness %
- Bugs → bug counts by severity
- Test Management → test pass rate
- Security & Ops → security score %

**Location**: `releases/domain/adapters/release-readiness.adapter.ts`

**Data Contract**:
```typescript
interface ReleaseReadinessDataDto {
  testPassRate: number;
  requirementsReadinessPercentage: number;
  bugCounts: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  securityScorePercentage: number;
}
```

**Usage in Release Aggregate**:
```typescript
const readinessData = await adapter.getReadinessData(tenantId);
release.evaluateReadiness(readinessData);
```

**Cache Strategy**:
- TTL: 30 seconds
- Invalidation: `adapter.invalidateCache(tenantId)`
- SLA: <500ms aggregation

### 2. SprintAdapter

**Purpose**: Convert Requirements to Sprint items without coupling

**Mapping**:
- Requirement → SprintItem
- RequirementStatus → SprintItemStatus
- RequirementPriority → SprintItemPriority
- RQSScore → QualityScore

**Location**: `sprints/domain/adapters/sprint.adapter.ts`

**Data Contract**:
```typescript
interface SprintItemDto {
  id: string;
  title: string;
  description: string;
  estimatedStoryPoints: number;
  priority: string;
  qualityScore: number;
}
```

**Usage in Sprint Aggregate**:
```typescript
const sprintItems = await sprintAdapter.mapRequirementsToSprintItems(reqIds);
for (const item of sprintItems) {
  sprint.addItem(item);
}
```

**Cache Strategy**:
- TTL: 5 minutes (relatively stable)
- Invalidation: `adapter.invalidateCache(requirementId)`
- SLA: <100ms per mapping

### 3. BugAdapter

**Purpose**: Provide bug metrics for Release gate validation

**Aggregations**:
- Bug counts by severity
- Blocking bug identification
- P0/Critical bug lists

**Location**: `bugs/domain/adapters/bug.adapter.ts`

**Data Contract**:
```typescript
interface BugMetricsDto {
  counts: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  blockingBugCount: number;
  isBlocked: boolean;
  blockingReason: string | null;
  criticalBugIds: readonly string[];
  p0BugIds: readonly string[];
}
```

**Usage in Release Aggregate**:
```typescript
const bugMetrics = await bugAdapter.getBugMetrics(tenantId);
if (bugMetrics.counts.critical > 0) {
  release.block('Critical bugs present');
}
```

**Cache Strategy**:
- TTL: 1 minute (high change frequency)
- Invalidation: `adapter.invalidateCache(tenantId)`
- SLA: <200ms aggregation

## Implementation Pattern

### 1. Define DTO Interface (Read-Only)
```typescript
export interface ReadinessDataDto {
  readonly testPassRate: number;
  // Use readonly to prevent accidental mutations
}
```

### 2. Create Adapter Service
```typescript
@Injectable()
export class ReleaseReadinessAdapter {
  async getReadinessData(tenantId: string): Promise<ReadinessDataDto> {
    // Fetch from external contexts
    // Transform to DTO
    // Return to aggregate
  }
}
```

### 3. Use in Aggregate
```typescript
// In Release aggregate
const data = await adapter.getReadinessData(tenantId);
release.evaluateReadiness(data);
```

## Cache Management

### When to Cache
- Expensive queries (multiple context lookups)
- Data that doesn't change frequently
- Metrics that are recalculated often

### Cache TTL Guidelines
- **High volatility** (bug fixes, test runs): 1-2 min
- **Medium volatility** (requirements approval): 5-10 min
- **Low volatility** (security checks): 30-60 min

### Cache Invalidation
```typescript
// Invalidate on external event
subscribe(BugCreatedEvent, () => {
  bugAdapter.invalidateCache(tenantId);
});

// Or clear all
adapter.clearAllCaches();
```

## Error Handling & Graceful Degradation

### Strategy: Conservative Estimates
```typescript
private getDefaultReadinessData(): ReleaseReadinessDataDto {
  return {
    testPassRate: 0,  // Conservative
    requirementsReadinessPercentage: 0,  // Conservative
    bugCounts: { critical: 0, ... },  // Optimistic
    securityScorePercentage: 100,  // Optimistic
  };
}
```

### Logic:
- **Conservative on quality metrics** (force verification)
- **Optimistic on counts** (other gates will catch issues)
- **Allows releases to proceed** when context unavailable
- **Other gates verify** even if this adapter fails

## Testing with ACLs

### Mock Adapter for Testing Aggregates
```typescript
// In test setup
const mockAdapter = {
  getReadinessData: jest.fn().mockResolvedValue({
    testPassRate: 85,
    requirementsReadinessPercentage: 90,
    bugCounts: { critical: 0, high: 1, medium: 2, low: 5 },
    securityScorePercentage: 95,
  }),
};

// Test Release in isolation
const release = Release.create({ ... });
release.evaluateReadiness(mockAdapter.getReadinessData());
```

## Future Enhancements

### 1. Caching Strategy
- Implement Redis caching for distributed scenarios
- Add cache warming for predictable queries
- Implement cache coherence protocols

### 2. Monitoring & Observability
- Track cache hit/miss ratios
- Monitor adapter performance (latency percentiles)
- Alert on context failures

### 3. Circuit Breaker Pattern
```typescript
// Prevent cascading failures
if (failureCount > threshold) {
  enableCircuitBreakerForContext();
  return getDefaultData();
}
```

### 4. Saga Pattern
- Use adapters in multi-step workflows
- Coordinate between contexts via domain events
- Implement compensating transactions

## Key Principles

1. **Read-Only DTOs**: Use `readonly` to prevent mutations
2. **Single Responsibility**: One adapter per context boundary
3. **Explicit Mapping**: Clear transformation logic
4. **Cache Management**: Appropriate TTLs and invalidation
5. **Error Resilience**: Graceful degradation on failures
6. **Performance**: <500ms SLA for aggregate operations
7. **Testability**: Easy to mock for aggregate testing

## Common Pitfalls to Avoid

❌ **Passing raw entity objects** → Use DTOs
❌ **Mutable DTOs** → Use `readonly` interfaces
❌ **No caching** → Add appropriate caches
❌ **Tight coupling** → Hide internal schemas
❌ **One-way dependencies** → Maintain clear boundaries
❌ **No error handling** → Implement graceful degradation

## Monitoring Checklist

- [ ] Cache hit/miss ratios tracked
- [ ] Adapter latency monitored
- [ ] Context availability monitored
- [ ] Graceful degradation tested
- [ ] Circuit breaker configured
- [ ] Error logging comprehensive
- [ ] Performance meets SLA
- [ ] DTOs remain immutable

---

**Last Updated**: December 12, 2025
**Pattern**: Anti-Corruption Layer (DDD)
**Status**: 3 adapters implemented
**Next**: Event Store integration
