# UAT Bug Fixing Guide - QANexus

**Document Status**: 🔥 Ready for UAT
**Last Updated**: December 12, 2025
**Audience**: QANexus development team
**Purpose**: Reference guide for systematically fixing UAT bugs without rewrites

---

## Table of Contents

1. [Quick Reference - Bug Triage & Root Cause](#quick-reference)
2. [Bug Fixing Philosophy](#philosophy)
3. [Fix Implementation Workflow](#workflow)
4. [Codebase Navigation Map](#navigation-map)
5. [Common Bug Patterns & Fixes](#patterns)
6. [Linting & Formatting Rules](#linting)
7. [Testing Approach](#testing)
8. [Checklist: Before Marking Bug as Fixed](#checklist)

---

## Quick Reference - Bug Triage & Root Cause

### Backend Bug Location Guide

| Symptom | Likely Location | How to Reproduce |
|---------|-----------------|------------------|
| **API returns 400/422** | `apps/api/src/[module]/[module].controller.ts` (validation) or DTO | Check request payload matches DTO schema |
| **API returns 500** | `apps/api/src/[module]/[module].service.ts` (business logic) | Check logs for stack trace, find catch block |
| **Data not saved to DB** | `apps/api/src/[module]/[module].entity.ts` or service save logic | Verify entity relations, cascades, FK constraints |
| **Multi-tenant isolation broken** | Missing `tenantId` filter in repository query | Search for `.find(` without `{ where: { tenantId } }` |
| **Event not published** | `apps/api/src/[module]/[module].service.ts` missing `eventStorePublisher.publishAll()` | Check service create/update methods for event publishing |
| **AI fails/returns null** | `apps/api/src/ai/providers/` or `apps/api/src/[module]/domain/adapters/` | Check AI provider config, rate limits, API key expiration |
| **Authorization fails (403)** | `apps/api/src/auth/guards/jwt-auth.guard.ts` or role check | Verify JWT token, @Roles() decorator applied |

### Frontend Bug Location Guide

| Symptom | Likely Location | How to Reproduce |
|---------|-----------------|------------------|
| **Page shows 404 or blank** | `apps/web/src/app/(dashboard)/[route]/page.tsx` | Check route exists, useQuery hook not erroring |
| **Data not loading** | `apps/web/src/services/[module].service.ts` or TanStack Query hook | Check API endpoint, network tab for 4xx/5xx |
| **Data doesn't update after save** | TanStack Query cache invalidation missing | Check useMutation, may need `queryClient.invalidateQueries()` |
| **Form validation fails** | `apps/web/src/types/` type definitions or form component | Check DTO matches backend, client-side validation logic |
| **Styling looks wrong** | `apps/web/src/components/` or `globals.css` | Check Tailwind classes, dark mode variables |
| **Button/modal doesn't respond** | Event handler in component or service call | Check console for errors, verify onClick/onChange attached |
| **AI status always shows offline** | `apps/web/src/components/AiStatusIndicator.tsx` | Check API call to AI settings endpoint |

---

## Philosophy

### Core Principles for UAT Bug Fixing

#### ✅ DO: Minimal, Targeted Fixes

```typescript
// ✅ GOOD: Fix only the broken logic
- If a user can't approve requirements because of a validation error,
  fix the validation rule, not the entire approval flow.
- If an event isn't published, add the publishAll() call,
  don't refactor the whole service.
```

#### ❌ DON'T: Rewrite for Perfection

```typescript
// ❌ BAD: Temptation to refactor while fixing
- DON'T refactor the service layer because the bug shows poor structure
- DON'T extract a helper function "while we're at it"
- DON'T move files to a "better location"
- Just fix the bug.
```

#### ✅ DO: Respect Existing Patterns

```typescript
// ✅ GOOD: Follow existing code conventions
- If existing code uses Repository pattern for data access,
  don't suddenly use raw QueryBuilder.
- If existing services use dependency injection,
  don't add static methods.
- If error handling uses HttpException, keep using it.
```

#### ❌ DON'T: Introduce New Technologies

```typescript
// ❌ BAD: Adding new tools mid-fix
- Don't add a new validation library if Zod is already used
- Don't introduce a new logging framework
- Don't switch from TypeORM to Prisma for "better performance"
- Stay within the existing tech stack
```

#### ✅ DO: Pass Lint & Format Checks

```bash
# Before marking any fix as done:
npm run lint       # Must pass ESLint
npm run format     # Must pass Prettier
npm run build      # Must compile with 0 TS errors
```

#### ✅ DO: Preserve Data Contracts

```typescript
// ✅ GOOD: Keep API response shape unchanged
// If endpoint returns:
{ id, title, content, rqs }

// After fix, should STILL return the same shape
// Don't remove a field or rename it without careful consideration
// If you must change it, update client-side types and test

// ✅ GOOD: Keep database schema unchanged for bug fixes
// Fixes should NOT require new migrations
// If migration needed, it should be part of the bug report requirements
```

---

## Fix Implementation Workflow

### Step 1: Reproduce the Bug

```bash
# 1a. Read the bug report carefully
   - What is the expected behavior?
   - What is the actual behavior?
   - What steps reproduce it?
   - What is the error message/screenshot?

# 1b. Set up your local environment
   docker-compose up -d                    # Start DB & Redis
   cd apps/api && npm run start:dev        # Start backend
   cd apps/web && npm run dev              # Start frontend in another terminal

# 1c. Reproduce using exact steps from bug report
   - If steps unclear, infer from the feature (see Navigation Map below)
   - Try to trigger the same error/symptom
   - Take notes: at what step does it fail?
   - Check browser console for JS errors
   - Check backend logs for API errors
```

### Step 2: Locate Root Cause Using MCP/Code Navigation

```bash
# 2a. Determine backend vs frontend issue
   - Frontend: JavaScript console errors, UI not responding, data not loading
   - Backend: API 4xx/5xx errors, database issues, AI provider issues
   - Both: Some auth/state issues affect both

# 2b. Use Grep to find relevant files

   # If API error about "requirements":
   grep -r "Requirement" apps/api/src/ --include="*.ts" | head -20

   # If state management issue:
   grep -r "invalidateQueries" apps/web/src/ --include="*.ts"

   # If validation failing:
   grep -r "validation\|dto\|schema" apps/api/src/ --include="*.ts"

# 2c. Trace the flow step-by-step
   - Start from UI action or API endpoint
   - Follow function calls down to root cause
   - Check error logs for exact error message
   - Look for TODOs or FIXMEs that might be related
```

### Step 3: Identify the Real Root Cause

```typescript
// Common root causes:

1. MISSING LOGIC
   // Symptom: Feature doesn't work at all
   // Example: Event not published after state change
   await this.repo.save(entity);  // ← Fix: Add this below
   await this.eventStorePublisher.publishAll(
     aggregate.getDomainEvents(),
     tenantId,
   );

2. INCORRECT LOGIC
   // Symptom: Feature partially works or wrong output
   // Example: Approval requires RQS >= 75, but code checks > 75
   if (requirement.rqs.score > 75) {  // ← BUG
   if (requirement.rqs.score >= 75) { // ← FIX

3. MISSING VALIDATION
   // Symptom: Bad data causes downstream errors
   // Example: Frontend sends undefined in payload
   if (!dto.title || !dto.title.trim()) {  // ← ADD THIS
     throw new BadRequestException('Title is required');
   }

4. MISSING FILTER
   // Symptom: Data leaks between tenants or users
   // Example: Finding requirement without tenant check
   const req = await this.repo.findOne(id);        // ← BUG
   const req = await this.repo.findOne(           // ← FIX
     { where: { id, tenantId } }
   );

5. WRONG STATE MACHINE TRANSITION
   // Symptom: Can't move entity to certain state
   // Example: Sprint item status not updating
   if (newStatus === 'done' && item.status === 'code_review') {
     item.status = newStatus;  // ← ADD THIS IF MISSING
   }

6. CACHE INVALIDATION MISSING
   // Symptom: Old data shown after edit
   // Example: Update successful but page still shows old value
   queryClient.invalidateQueries({
     queryKey: ['requirements', id]
   });
```

### Step 4: Implement Minimal Fix

```typescript
// TEMPLATE: Fix Implementation

// BEFORE: Broken code
async approve(id: string, tenantId: string) {
  const req = await this.repo.findOne(id);
  if (!req) throw new NotFoundException();

  req.status = 'APPROVED';
  return await this.repo.save(req);
  // ← BUG: Event not published
}

// AFTER: Fixed code (minimal changes only)
async approve(id: string, tenantId: string) {
  const req = await this.repo.findOne({ where: { id, tenantId } });  // ← Added tenantId filter
  if (!req) throw new NotFoundException();

  req.status = 'APPROVED';
  const approved = await this.repo.save(req);

  // ← ADD THIS: Publish event
  const aggregate = RequirementAggregate.recreate(approved);
  await this.eventStorePublisher.publishAll(
    aggregate.getDomainEvents(),
    tenantId,
  );

  return approved;
}

// Changes made:
// 1. Added tenantId to findOne filter (security/correctness)
// 2. Added eventStorePublisher.publishAll() (missing event publication)
// Nothing else changed - kept same function signature, return type, error handling
```

### Step 5: Lint & Format

```bash
# 5a. Fix linting issues
cd apps/api
npm run lint -- --fix                      # Auto-fix ESLint
npm run format                             # Prettier format

cd ../web
npm run lint -- --fix
npm run format

# 5b. Check for TypeScript errors
npm run build                              # Should compile with 0 errors

# 5c. Run tests if available
npm run test                               # Unit tests
npm run test:e2e                           # E2E tests (if applicable)
```

### Step 6: Manual Verification

```bash
# 6a. Verify the fix works locally
# Use exact steps from bug report
# Confirm: expected behavior now occurs
# Confirm: no new errors in console/logs

# 6b. Sanity check related flows
# If you fixed requirement approval:
#   - Check requirement creation still works
#   - Check requirement list loading
#   - Check requirement deletion
#   - Confirm no new 500 errors

# 6c. Check for regressions
# Did fixing this bug break anything else?
# Run broader test scenarios
```

### Step 7: Mark Bug as Fixed & Document

```bash
# 7a. Create git commit
git add [modified-files]
git commit -m "fix: [module] - [short description of bug and fix]

Root cause: [Why did this bug happen?]

Fix: [What changed to resolve it?]

Files changed:
- apps/api/src/requirements/requirements.service.ts

Testing: [How was this verified?]
"

# 7b. Push to branch
git push origin [branch-name]

# 7c. Create PR with bug fix details
# Link to bug report
# Describe the root cause
# List files changed
# Note any edge cases or considerations
```

---

## Navigation Map

### Backend Module Map

```
🎯 REQUIREMENTS DOMAIN (Bug fixing hotspots)
├─ Controller: apps/api/src/requirements/requirements.controller.ts
├─ Service: apps/api/src/requirements/requirements.service.ts
│  └─ Key methods: create(), findOne(), update(), analyze(), approve()
├─ Entity: apps/api/src/requirements/requirement.entity.ts
│  └─ State machine: DRAFT → PUBLISHED → APPROVED → BACKLOGGED
├─ Aggregate: apps/api/src/requirements/domain/requirement.aggregate.ts
│  └─ Business logic: invariants, validation, event publishing
├─ Events: apps/api/src/requirements/domain/events/
│  └─ RequirementCreated, RequirementApproved, RequirementAnalyzed
└─ DTO: apps/api/src/requirements/dto/
   └─ create-requirement.dto.ts, update-requirement.dto.ts

🎯 SPRINTS DOMAIN
├─ Controller: apps/api/src/sprints/sprints.controller.ts
├─ Service: apps/api/src/sprints/sprints.service.ts
├─ Entities: sprint.entity.ts, sprint-item.entity.ts
├─ Aggregate: apps/api/src/sprints/domain/sprint.aggregate.ts
└─ Key method: addItem(), start(), complete()

🎯 RELEASES DOMAIN
├─ Controller: apps/api/src/releases/releases.controller.ts
├─ Service: apps/api/src/releases/releases.service.ts
├─ Entity: release.entity.ts
├─ RCS Service: apps/api/src/releases/rcs.service.ts
│  └─ 4-pillar scoring: calculateRcs()
├─ Adapter: apps/api/src/releases/domain/adapters/release-readiness.adapter.ts
│  └─ Anti-corruption layer for cross-context data
└─ Events: ReleaseCreated, ReleaseReadinessEvaluated, ReleaseReadinessAchieved

🎯 BUGS DOMAIN
├─ Service: apps/api/src/bugs/bugs.service.ts
├─ Entity: bug.entity.ts
├─ Triage: apps/api/src/bugs/bug-triage.service.ts
│  └─ AI-powered severity/priority assignment
└─ Events: BugCreated, BugTriaged, BugResolved

🎯 DOCUMENTS DOMAIN
├─ Service: apps/api/src/documents/documents.service.ts
├─ AI Service: apps/api/src/documents/documents-ai.service.ts
│  └─ Document analysis pipeline
├─ Confluence: apps/api/src/documents/confluence.service.ts
│  └─ Confluence API integration
└─ Upload: apps/api/src/documents/file-upload.service.ts

🎯 AI INTEGRATION
├─ Factory: apps/api/src/ai/providers/ai-provider.factory.ts
│  └─ Provider selection & configuration
├─ Providers:
│  ├─ openai.provider.ts
│  ├─ anthropic.provider.ts
│  ├─ gemini.provider.ts
│  └─ foundry-local.provider.ts
└─ RAG: apps/api/src/ai/rag.service.ts
   └─ Semantic search with pgvector

🎯 AUTH & MULTI-TENANCY
├─ Auth Guard: apps/api/src/auth/guards/jwt-auth.guard.ts
├─ JWT Strategy: apps/api/src/auth/strategies/jwt.strategy.ts
├─ Roles Guard: apps/api/src/auth/guards/roles.guard.ts
└─ Tenant Middleware: apps/api/src/common/middleware/tenant.middleware.ts

🎯 EVENT SOURCING & DOMAIN EVENTS
├─ Publisher: apps/api/src/common/domain/domain-event.publisher.ts
├─ EventStore Service: apps/api/src/common/event-store/services/event-store.service.ts
├─ EventStore Publisher: apps/api/src/common/event-store/event-store-publisher.ts
└─ Event Subscribers: apps/api/src/common/domain/event-subscribers/
   ├─ requirement-approved.subscriber.ts
   ├─ sprint-started.subscriber.ts
   ├─ release-readiness-evaluated.subscriber.ts
   └─ [7 more subscribers]
```

### Frontend Page Map

```
🎯 DOCUMENTS
├─ List: apps/web/src/app/(dashboard)/documents/page.tsx
│  └─ Upload button, Confluence import
├─ Detail: apps/web/src/app/(dashboard)/documents/[id]/page.tsx
│  └─ Tiptap editor + AI review sidebar
└─ AI Panel: apps/web/src/components/documents/AiReviewPanel.tsx
   └─ AI findings display

🎯 REQUIREMENTS
├─ List: apps/web/src/app/(dashboard)/requirements/page.tsx
├─ Create: apps/web/src/app/(dashboard)/requirements/new/page.tsx
├─ Detail: apps/web/src/app/(dashboard)/requirements/[id]/page.tsx
│  └─ Edit, approve, generate tasks, delete
└─ Service: apps/web/src/services/requirements.service.ts

🎯 SPRINT PLANNING (BACKLOG)
├─ Page: apps/web/src/app/(dashboard)/planning/page.tsx
│  └─ Drag requirements ↔ sprint items
├─ Service: apps/web/src/services/sprints.service.ts
└─ Hook: apps/web/src/hooks/useSprints.ts

🎯 SPRINTS
├─ List: apps/web/src/app/(dashboard)/sprints/page.tsx
├─ Detail: apps/web/src/app/(dashboard)/sprints/[id]/page.tsx
├─ Analytics: apps/web/src/app/(dashboard)/sprints/[id]/analytics/page.tsx
└─ Service: apps/web/src/services/sprints.service.ts

🎯 TASKS
├─ Create: apps/web/src/app/(dashboard)/tasks/new/page.tsx
├─ Detail: apps/web/src/app/(dashboard)/tasks/[id]/page.tsx
│  └─ Edit, delete, change status
└─ Service: apps/web/src/services/sprints.service.ts (SprintItem endpoints)

🎯 RELEASES
├─ List: apps/web/src/app/(dashboard)/releases/page.tsx
├─ Detail: apps/web/src/app/(dashboard)/releases/[id]/page.tsx
│  └─ RCS gauge, quality gates, status management
├─ Gauge: apps/web/src/components/releases/RcsGauge.tsx
├─ Pillar: apps/web/src/components/releases/PillarCard.tsx
└─ Service: apps/web/src/services/releases.service.ts

🎯 AUTHENTICATION
├─ Login: apps/web/src/app/(auth)/login/page.tsx
├─ Service: apps/web/src/services/auth.service.ts
└─ Context: apps/web/src/contexts/AuthContext.tsx
```

### API Endpoint Quick Reference

```
REQUIREMENTS
  POST   /requirements                  - Create
  GET    /requirements                  - List all
  GET    /requirements/:id              - Get one
  PATCH  /requirements/:id              - Update
  DELETE /requirements/:id              - Delete
  POST   /requirements/:id/analyze      - AI analysis
  POST   /requirements/:id/approve      - Approve requirement
  POST   /requirements/:id/generate-tasks - Generate tasks
  POST   /requirements/:id/move-tasks-backlog - Move to backlog

SPRINTS
  POST   /sprints                       - Create sprint
  GET    /sprints                       - List sprints
  GET    /sprints/:id                   - Get sprint detail
  PATCH  /sprints/:id                   - Update sprint
  DELETE /sprints/:id                   - Delete sprint
  POST   /sprints/:id/start             - Start sprint
  POST   /sprints/:id/complete          - Complete sprint
  GET    /sprints/backlog/structured    - Get backlog items
  POST   /sprints/items                 - Create sprint item
  PATCH  /sprints/items/:id             - Update sprint item
  DELETE /sprints/items/:id             - Delete sprint item

RELEASES
  POST   /releases                      - Create release
  GET    /releases                      - List releases
  GET    /releases/:id                  - Get release detail
  PATCH  /releases/:id                  - Update release
  DELETE /releases/:id                  - Delete release
  POST   /releases/:id/rcs              - Calculate RCS
  POST   /releases/:id/evaluate-gates   - Evaluate quality gates

DOCUMENTS
  POST   /documents                     - Create document
  GET    /documents                     - List documents
  GET    /documents/:id                 - Get document
  PATCH  /documents/:id                 - Update document
  DELETE /documents/:id                 - Delete document
  POST   /documents/:id/analyze         - AI analysis
  POST   /documents/upload              - File upload
  POST   /documents/import/confluence   - Confluence import

BUGS
  POST   /bugs                          - Create bug
  GET    /bugs                          - List bugs
  GET    /bugs/:id                      - Get bug
  PATCH  /bugs/:id                      - Update bug
  DELETE /bugs/:id                      - Delete bug
  POST   /bugs/:id/triage               - AI triage

AI
  GET    /ai/providers                  - Get configured provider
  GET    /ai/providers/:provider/models - Get available models
  POST   /ai/search                     - RAG search
```

---

## Common Bug Patterns & Fixes

### Pattern 1: Missing Multi-Tenant Filter

**Symptom**: Data leaks between tenants or 404 when should exist

**Root Cause**: Repository query missing `tenantId` filter

```typescript
// ❌ BUGGY CODE
async findOne(id: string) {
  return this.repo.findOne({ where: { id } });
  // ← Missing tenantId filter, might return other tenant's data!
}

// ✅ FIXED CODE
async findOne(id: string, tenantId: string) {
  return this.repo.findOne({ where: { id, tenantId } });
  // ← Added tenantId ensures tenant isolation
}

// ✅ CONTROLLER must pass tenantId
async findOne(
  @Param('id') id: string,
  @CurrentTenant() tenantId: string,  // ← Use custom decorator
) {
  return this.service.findOne(id, tenantId);
}
```

**Search & Fix**:
```bash
# Find all repository queries that might be missing tenantId
grep -n "findOne.*{ where:" apps/api/src/[module]/[module].service.ts
grep -n "find.*{ where:" apps/api/src/[module]/[module].service.ts

# Check if tenantId is included in every where clause
```

---

### Pattern 2: Event Not Published

**Symptom**: State changes but event subscribers don't trigger; no audit trail

**Root Cause**: Service creates/updates entity but doesn't publish events

```typescript
// ❌ BUGGY CODE
async approve(id: string, tenantId: string) {
  const req = await this.repo.findOne({ where: { id, tenantId } });
  req.status = 'APPROVED';
  return await this.repo.save(req);
  // ← BUG: Event not published, subscribers never fire
}

// ✅ FIXED CODE
async approve(id: string, tenantId: string) {
  const req = await this.repo.findOne({ where: { id, tenantId } });
  req.status = 'APPROVED';
  const approved = await this.repo.save(req);

  // ← ADD THIS: Create aggregate and publish events
  const aggregate = RequirementAggregate.recreate(approved);
  await this.eventStorePublisher.publishAll(
    aggregate.getDomainEvents(),
    tenantId,
  );

  return approved;
}
```

**Search & Fix**:
```bash
# Find create/update methods that might not publish events
grep -A 10 "async create\|async update" apps/api/src/[module]/[module].service.ts

# Check if eventStorePublisher.publishAll is called
# If not, add it before returning
```

---

### Pattern 3: Incorrect State Machine Transition

**Symptom**: Can't transition entity to certain state; validation error

**Root Cause**: State machine logic is missing or wrong

```typescript
// ❌ BUGGY CODE
async updateStatus(id: string, newStatus: string, tenantId: string) {
  const item = await this.repo.findOne({ where: { id, tenantId } });
  item.status = newStatus;  // ← BUG: No validation!
  return await this.repo.save(item);
  // Allows invalid transitions like: done → todo
}

// ✅ FIXED CODE
async updateStatus(id: string, newStatus: string, tenantId: string) {
  const item = await this.repo.findOne({ where: { id, tenantId } });

  // ← ADD THIS: Validate state transition
  const validTransitions = {
    'todo': ['in_progress'],
    'in_progress': ['code_review', 'todo'],
    'code_review': ['ready_for_qa', 'in_progress'],
    'ready_for_qa': ['in_testing', 'code_review'],
    'in_testing': ['done', 'ready_for_qa'],
    'done': []
  };

  if (!validTransitions[item.status]?.includes(newStatus)) {
    throw new BadRequestException(
      `Cannot transition from ${item.status} to ${newStatus}`
    );
  }

  item.status = newStatus;
  return await this.repo.save(item);
}
```

**Search & Fix**:
```bash
# Look for state enum definitions
grep -r "enum.*Status\|Status.*=" apps/api/src/[module]/ --include="*.ts"

# Find update methods that change status
grep -n "\.status = \|status:" apps/api/src/[module]/[module].service.ts

# Add validation before assignment
```

---

### Pattern 4: Cache Not Invalidated After Update (Frontend)

**Symptom**: Page shows old data after save; user confused

**Root Cause**: TanStack Query cache not cleared after mutation

```typescript
// ❌ BUGGY CODE - useMutation hook
const useUpdateRequirement = (id: string) => {
  return useMutation({
    mutationFn: (data) => api.patch(`/requirements/${id}`, data),
    // ← BUG: No cache invalidation!
  });
};

// ✅ FIXED CODE - Add cache invalidation
const useUpdateRequirement = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => api.patch(`/requirements/${id}`, data),
    onSuccess: () => {
      // ← ADD THIS: Invalidate affected queries
      queryClient.invalidateQueries({
        queryKey: ['requirements', id]  // Single requirement
      });
      queryClient.invalidateQueries({
        queryKey: ['requirements']  // Requirement list
      });
    }
  });
};
```

**Search & Fix**:
```bash
# Find all useMutation hooks
grep -n "useMutation" apps/web/src/hooks/ --include="*.ts"

# Check if they have onSuccess with cache invalidation
grep -A 5 "useMutation" apps/web/src/hooks/ --include="*.ts" | grep invalidateQueries

# If missing, add onSuccess callback with invalidateQueries
```

---

### Pattern 5: API Validation Error Response Not Handled (Frontend)

**Symptom**: Vague "Something went wrong" instead of helpful error message

**Root Cause**: Error handler doesn't extract validation error details

```typescript
// ❌ BUGGY CODE
try {
  await createRequirement(data);
} catch (error) {
  toast.error('Failed to create requirement');  // ← Useless message
}

// ✅ FIXED CODE - Extract meaningful error message
try {
  await createRequirement(data);
} catch (error) {
  if (error instanceof ApiError) {
    if (error.status === 400 || error.status === 422) {
      // ← Validation error from backend
      const message = error.message || 'Please check your input';
      toast.error(message);  // ← User-friendly message
    } else if (error.status === 401) {
      router.push('/login');  // ← Auth error
    } else {
      toast.error('Server error. Please try again.');
    }
  }
}
```

**Search & Fix**:
```bash
# Find generic error messages
grep -n "Something went wrong\|Error\|Failed" apps/web/src/app/ --include="*.tsx"

# Check error handling for ApiError extraction
# If missing, add proper error message extraction
```

---

### Pattern 6: AI Provider Not Configured or Fails Silently

**Symptom**: Document analysis returns null or empty; no error shown

**Root Cause**: AI provider missing or error not logged

```typescript
// ❌ BUGGY CODE
async analyze(id: string, tenantId: string) {
  const doc = await this.repo.findOne({ where: { id, tenantId } });
  const review = await this.aiFactory.analyzeDocument(doc);
  // ← BUG: What if aiFactory returns null? No error handling!
  return { ...doc, aiReview: review };
}

// ✅ FIXED CODE - Add error handling
async analyze(id: string, tenantId: string) {
  const doc = await this.repo.findOne({ where: { id, tenantId } });

  try {
    const review = await this.aiFactory.analyzeDocument(doc);
    if (!review) {
      this.logger.warn(`AI analysis returned null for doc ${id}`);
      throw new BadRequestException('AI analysis failed. Check provider configuration.');
    }
    return { ...doc, aiReview: review };
  } catch (error) {
    this.logger.error(`AI analysis error for doc ${id}:`, error);
    if (error.message?.includes('API key')) {
      throw new BadRequestException('AI provider not configured. Check API keys.');
    }
    throw error;
  }
}
```

**Search & Fix**:
```bash
# Find AI provider calls
grep -n "aiFactory\|getProvider\|generateEmbeddings" apps/api/src/ --include="*.ts"

# Check error handling around AI calls
# Add try-catch with helpful error messages
```

---

### Pattern 7: TypeScript Null/Undefined Not Handled

**Symptom**: Runtime error "Cannot read property of undefined"

**Root Cause**: Not checking for null/undefined before accessing property

```typescript
// ❌ BUGGY CODE
const requirement = await this.repo.findOne({ where: { id, tenantId } });
console.log(requirement.title);  // ← What if requirement is null?

// ✅ FIXED CODE
const requirement = await this.repo.findOne({ where: { id, tenantId } });
if (!requirement) {
  throw new NotFoundException(`Requirement ${id} not found`);
}
console.log(requirement.title);  // ← Safe now
```

**Search & Fix**:
```bash
# Find potential null dereferences
grep -n "await.*findOne\|await.*get\|?.find" apps/api/src/[module]/ --include="*.ts"

# After any of these, check for null check
# If missing, add it with appropriate exception
```

---

## Linting & Formatting Rules

### Backend (NestJS API)

```bash
# 🔍 Check linting issues
cd apps/api
npm run lint

# 🔧 Auto-fix common issues
npm run lint -- --fix

# 📏 Format code
npm run format

# 🏗️ Type-check
npm run build

# ✅ All must pass before commit
```

**ESLint Rules Active**:
- `no-console` - Remove console logs (except logger)
- `no-unused-vars` - Remove dead code
- `prefer-const` - Use const for immutable vars
- `explicit-function-return-types` - TypeScript functions must have return type
- `no-floating-promises` - Async operations must be awaited or chained
- `no-explicit-any` - Avoid `any` type, use proper types

**Naming Conventions**:
```typescript
// Classes: PascalCase
export class RequirementService {}

// Functions: camelCase
async approveRequirement() {}

// Constants: UPPER_SNAKE_CASE
const MAX_RETRIES = 3;

// Private properties: _camelCase or #private
private _logger: Logger;

// Files: kebab-case.ts
requirement.service.ts
requirement.controller.ts
```

### Frontend (Next.js Web)

```bash
# 🔍 Check linting
cd apps/web
npm run lint

# 🔧 Auto-fix
npm run lint -- --fix

# 📏 Format
npm run format

# 🏗️ Build check
npm run build
```

**ESLint Rules**:
- `react/no-unescaped-entities` - Escape HTML chars
- `@next/next/no-html-link-for-pages` - Use Link component
- `no-unused-vars` - Remove dead code
- `react-hooks/rules-of-hooks` - Hooks must follow rules

**Naming Conventions**:
```typescript
// Components: PascalCase
export function RequirementCard() {}

// Functions: camelCase
const handleApprove = () => {};

// Constants: UPPER_SNAKE_CASE
const MAX_REQUIREMENTS = 100;

// Hooks: useXxx
function useRequirements() {}

// Types/Interfaces: PascalCase
interface Requirement {}
type RequirementStatus = 'DRAFT' | 'APPROVED';

// Files: kebab-case.tsx or useXxx.ts
requirement-card.tsx
use-requirements.ts
```

---

## Testing Approach

### Backend Unit Testing

```typescript
// Location: apps/api/src/[module]/[module].service.spec.ts

// Template
describe('RequirementsService', () => {
  let service: RequirementsService;
  let repo: Repository<Requirement>;
  let eventPublisher: DomainEventPublisher;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RequirementsService,
        {
          provide: getRepositoryToken(Requirement),
          useValue: { findOne: jest.fn(), save: jest.fn() },
        },
        {
          provide: DomainEventPublisher,
          useValue: { publish: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(RequirementsService);
    repo = module.get(getRepositoryToken(Requirement));
    eventPublisher = module.get(DomainEventPublisher);
  });

  it('should create requirement with event published', async () => {
    const dto = { title: 'Test', content: 'Content' };

    jest.spyOn(repo, 'save').mockResolvedValue({ id: '1', ...dto });

    const result = await service.create(dto, { tenantId: 'tenant-1' });

    expect(result).toBeDefined();
    expect(eventPublisher.publish).toHaveBeenCalled();  // ← Verify event published
  });
});
```

**Run Tests**:
```bash
npm run test                # Run all tests
npm run test -- --watch    # Watch mode
npm run test -- filename   # Specific file
npm run test:cov          # Coverage report
```

### Frontend Component Testing

```typescript
// Location: apps/web/src/components/requirement-card.spec.tsx

import { render, screen } from '@testing-library/react';
import RequirementCard from './requirement-card';

describe('RequirementCard', () => {
  it('should render requirement title', () => {
    const req = { id: '1', title: 'Test Requirement', status: 'DRAFT' };
    render(<RequirementCard requirement={req} />);

    expect(screen.getByText('Test Requirement')).toBeInTheDocument();
  });

  it('should call onApprove when button clicked', () => {
    const mockApprove = jest.fn();
    render(<RequirementCard requirement={req} onApprove={mockApprove} />);

    screen.getByRole('button', { name: /approve/i }).click();

    expect(mockApprove).toHaveBeenCalled();
  });
});
```

**When to Add Tests for Bug Fix**:
```
✅ DO add tests if:
   - Bug is due to logic error (wrong condition)
   - Bug is due to missing edge case handling
   - Bug is a regression that happened before

❌ DON'T add tests if:
   - Bug is one-off typo or obvious mistake
   - Test infrastructure not set up in that module
   - Fixing bug doesn't require new test logic
```

**Verify Bug Fix with Tests**:
```bash
# 1. Run test before fix - should FAIL
npm run test -- filename

# 2. Implement fix

# 3. Run test - should PASS
npm run test -- filename

# 4. Run full test suite
npm run test

# 5. Check no regressions
npm run test:cov  # Coverage shouldn't decrease
```

---

## Checklist: Before Marking Bug as Fixed

### Before Pushing Code

- [ ] **Bug reproduced locally** - I can see the same error/behavior
- [ ] **Root cause identified** - I understand WHY it happened
- [ ] **Fix is minimal** - Only changed what was necessary
- [ ] **No new technologies introduced** - Stayed within existing stack
- [ ] **No refactoring** - Didn't restructure code unnecessarily

### Code Quality

- [ ] **Lint passes** - `npm run lint` with 0 errors
- [ ] **Format clean** - `npm run format` applied
- [ ] **TypeScript compiles** - `npm run build` with 0 errors
- [ ] **No new warnings** - Build output clean
- [ ] **Proper error handling** - Added try-catch where needed

### Data & Architecture

- [ ] **Multi-tenant filters included** - `tenantId` checked where needed
- [ ] **Events published** - State changes trigger `eventStorePublisher.publishAll()`
- [ ] **Cache invalidated** - Frontend queries re-fetched after mutations
- [ ] **API contract preserved** - Response format unchanged
- [ ] **Database schema untouched** - No new migrations needed

### Testing

- [ ] **Bug scenario verified** - Original steps no longer reproduce error
- [ ] **Related flows tested** - Sanity checked adjacent features
- [ ] **No new errors** - Browser console & server logs clean
- [ ] **Unit tests updated** - If test file exists, tests updated/added
- [ ] **Test suite passes** - `npm run test` shows all passing

### Documentation

- [ ] **Commit message clear** - Explains bug and fix
- [ ] **Code comments added** - Non-obvious logic explained
- [ ] **No TODO/FIXME left** - Cleanup any debug code
- [ ] **PR description complete** - Links bug report, shows testing steps

### Before Marking DONE

- [ ] **Get code review** - At least one other engineer reviews
- [ ] **Merge to main** - Code integrated to main branch
- [ ] **Deploy to staging** - Tested in staging environment
- [ ] **Verify in staging** - UAT tester confirms fix works
- [ ] **Mark bug as CLOSED** - Update issue tracker

---

## Example: Complete Bug Fix Walkthrough

### Bug Report
```
Title: Requirement approval fails silently
Description: When I try to approve a requirement, the page shows success
but the requirement is still in DRAFT status. Events not recorded.
Steps:
  1. Create new requirement
  2. Click "Analyze" to get RQS score
  3. Click "Approve" button
  4. See success toast, but status doesn't change
Expected: Requirement moves to APPROVED status
Actual: Requirement stays DRAFT, no error shown
```

### Step 1: Reproduce
```bash
# Local setup
docker-compose up -d
cd apps/api && npm run start:dev
cd apps/web && npm run dev

# Follow bug steps
# → Confirmed: "Approve" button doesn't change status
# → Check browser console: No JS errors
# → Check server logs: POST /requirements/:id/approve returns 200
# → But GET /requirements/:id still shows status: DRAFT
```

### Step 2: Root Cause Investigation
```bash
# Search for approve endpoint
grep -n "approve" apps/api/src/requirements/requirements.controller.ts
# Found: POST /requirements/:id/approve → calls service.update()

# Check service implementation
grep -A 15 "async update\|approve" apps/api/src/requirements/requirements.service.ts

# ❌ FOUND BUG: Service updates entity but doesn't publish event
# Events not persisted → subscribers don't fire
# → No audit trail either
```

### Step 3: Implement Fix
```typescript
// File: apps/api/src/requirements/requirements.service.ts

// BEFORE
async update(
  id: string,
  updateDto: UpdateRequirementDto,
  user: IAuthUser,
) {
  const req = await this.repo.findOne({ where: { id, tenantId: user.tenantId } });
  if (!req) throw new NotFoundException();

  // Update entity
  Object.assign(req, updateDto);
  const updated = await this.repo.save(req);

  // ❌ MISSING: Event publication!
  return updated;
}

// AFTER - Fixed
async update(
  id: string,
  updateDto: UpdateRequirementDto,
  user: IAuthUser,
) {
  const req = await this.repo.findOne({ where: { id, tenantId: user.tenantId } });
  if (!req) throw new NotFoundException();

  // Update entity
  Object.assign(req, updateDto);
  const updated = await this.repo.save(req);

  // ✅ ADD THIS: Recreate aggregate and publish events
  const aggregate = RequirementAggregate.recreate(updated);
  await this.eventStorePublisher.publishAll(
    aggregate.getDomainEvents(),
    user.tenantId,
  );

  return updated;
}
```

### Step 4: Lint & Format
```bash
cd apps/api
npm run lint -- --fix           # Fixed linting
npm run format                  # Formatted code
npm run build                   # ✅ Compiles with 0 errors
```

### Step 5: Verify Fix
```bash
# Test in browser
# 1. Create requirement
# 2. Click Analyze → RQS > 75
# 3. Click Approve
# → ✅ Status changes to APPROVED
# → ✅ Toast shows success
# → ✅ Page auto-refreshes with new status

# Check backend logs
# ✅ Event published: RequirementApproved
# ✅ No 500 errors

# Check related flows
# ✅ Requirement list still loads
# ✅ Other requirements unaffected
# ✅ No new errors in console
```

### Step 6: Create Test
```typescript
// apps/api/src/requirements/requirements.service.spec.ts

it('should publish event when requirement updated', async () => {
  const req = { id: '1', title: 'Test', status: 'DRAFT', tenantId: 'tenant-1' };
  jest.spyOn(repo, 'findOne').mockResolvedValue(req);
  jest.spyOn(repo, 'save').mockResolvedValue({ ...req, status: 'APPROVED' });
  jest.spyOn(eventPublisher, 'publishAll').mockResolvedValue([]);

  await service.update('1', { status: 'APPROVED' }, { tenantId: 'tenant-1' });

  expect(eventPublisher.publishAll).toHaveBeenCalled();  // ← Verifies fix
});
```

### Step 7: Git Commit
```bash
git add apps/api/src/requirements/requirements.service.ts
git add apps/api/src/requirements/requirements.service.spec.ts

git commit -m "fix: requirements - publish event on update

Root cause: Service was updating requirement but not publishing
domain events, causing subscribers to not trigger and no audit trail.

Fix: Added eventStorePublisher.publishAll() after saving entity update.
This recreates aggregate from updated entity and publishes all events.

Files changed:
- apps/api/src/requirements/requirements.service.ts
- apps/api/src/requirements/requirements.service.spec.ts

Testing:
- Verified requirement status changes on approve
- Verified RequirementApproved event published
- Verified subscribers receive event
- All existing tests still pass
"

git push origin fix/requirement-approval-event
```

### Step 8: Create PR
```
Title: Fix: Requirement approval not publishing events

Description:
When approving a requirement, the status was being updated in the
database but domain events were not being published. This meant:
- Event subscribers (email, metrics) didn't trigger
- No audit trail recorded
- Frontend would show stale data

Root Cause:
RequirementsService.update() was persisting the change but not calling
eventStorePublisher.publishAll() to publish domain events.

Fix:
Added event publishing after saving requirement. Aggregate is recreated
from updated entity and all accumulated domain events are published.

Verification:
✅ Requirement approval flow works end-to-end
✅ Events published and persisted to event store
✅ Event subscribers receive notifications
✅ All existing tests pass
✅ No regressions in related flows

Files Changed:
- apps/api/src/requirements/requirements.service.ts (+5 lines)
- apps/api/src/requirements/requirements.service.spec.ts (+8 lines)
```

---

## Summary

You are now equipped to systematically fix UAT bugs in QANexus:

1. ✅ **Understand the architecture** - You have mental maps of backend & frontend
2. ✅ **Locate issues quickly** - You know where to look for each domain
3. ✅ **Identify root causes** - You recognize common bug patterns
4. ✅ **Implement minimal fixes** - You know how to fix without rewriting
5. ✅ **Maintain code quality** - You follow linting, formatting, testing rules
6. ✅ **Verify thoroughly** - You have a checklist before marking bugs fixed

### Quick Decision Tree for Any Bug

```
Bug report received
  ↓
Is it frontend or backend?
  ├─ Frontend: Check browser console errors → services → hooks → types
  └─ Backend: Check server logs → controller → service → entity
  ↓
Find the broken code
  ├─ Using grep or MCP code search
  ├─ Trace function calls to root cause
  └─ Identify from common patterns
  ↓
Implement minimal fix
  ├─ Change only what's necessary
  ├─ Respect existing patterns
  └─ Add error handling/validation if needed
  ↓
Lint, format, build, test
  ├─ npm run lint -- --fix
  ├─ npm run format
  ├─ npm run build
  └─ npm run test
  ↓
Verify locally & create commit
  ├─ Reproduce original bug → Fixed ✅
  ├─ Check related flows
  └─ Create PR with clear explanation
```

**You're ready for UAT bugs! 🚀**
