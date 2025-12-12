# QANexus Domain Workflows Guide

**Updated**: December 12, 2025 | **Purpose**: Document all major domain workflows and state transitions

---

## Documents Domain

### Document Lifecycle

**Status Flow**: `DRAFT` → `IN_REVIEW` → `AI_ANALYZING` → `FIXING_GAPS` → `READY_FOR_IMPLEMENTATION` → `FINAL`

#### Detailed Workflow

```
┌─────────────────────────────────────────────────────────┐
│ 1. CREATE DOCUMENT (DRAFT)                              │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ POST /api/documents                                     │
│ {                                                        │
│   title: "Product Requirements Doc",                   │
│   content: "...",                                       │
│   source: "MANUAL" | "UPLOAD" | "CONFLUENCE",         │
│   sourceUrl?: "https://..."                            │
│ }                                                        │
│                                                          │
│ Response:                                               │
│ {                                                        │
│   id: "doc-uuid",                                      │
│   status: "DRAFT",                                     │
│   version: 1,                                          │
│   authorId: "user-uuid",                              │
│   createdAt: "2025-12-12T10:00:00Z"                   │
│ }                                                        │
│                                                          │
└─────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────┐
│ 2. SUBMIT FOR REVIEW (IN_REVIEW)                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ PATCH /api/documents/:id                               │
│ {                                                        │
│   status: "IN_REVIEW"                                  │
│ }                                                        │
│                                                          │
│ Team reviews document for completeness                 │
│ Timeline: 1-3 days typically                           │
│                                                          │
└─────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────┐
│ 3. AI ANALYSIS (AI_ANALYZING)                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ POST /api/documents/:id/analyze                        │
│                                                          │
│ AiProviderFactory selects provider (OpenAI/Anthropic) │
│                                                          │
│ AI Analysis:                                            │
│ ├─ Content clarity assessment                          │
│ ├─ Gap identification                                  │
│ │  ├─ Missing acceptance criteria                     │
│ │  ├─ Unclear requirements scope                      │
│ │  └─ Risk analysis not documented                    │
│ ├─ Suggestions for improvement                        │
│ └─ RCS pillar readiness (Completeness, Clarity, etc.) │
│                                                          │
│ Response: DocumentAIReview                            │
│ {                                                        │
│   score: 65,  // 0-100                                │
│   summary: "Document is 65% complete...",            │
│   gaps: [                                              │
│     { gap: "Missing performance metrics",              │
│       suggestion: "Add SLA targets for response time"} │
│   ],                                                    │
│   risks: [                                              │
│     { risk: "Unclear role permissions",               │
│       severity: "HIGH",                                │
│       mitigation: "Clarify RBAC matrix" }             │
│   ]                                                     │
│ }                                                        │
│                                                          │
│ Document status: AI_ANALYZING                          │
│                                                          │
└─────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────┐
│ 4. FIXING GAPS (FIXING_GAPS)                           │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ User updates document based on AI feedback             │
│ - Adds missing sections                                │
│ - Clarifies ambiguities                                │
│ - Addresses identified risks                           │
│                                                          │
│ PATCH /api/documents/:id                              │
│ {                                                        │
│   content: "Updated content with fixes...",           │
│   status: "FIXING_GAPS"                               │
│ }                                                        │
│                                                          │
│ DocumentVersion created (auto-versioning)             │
│ ├─ version: 2                                          │
│ ├─ authorId: user-uuid                                │
│ └─ changes: [...diffs]                                │
│                                                          │
│ Optional: Re-analyze to verify fixes                   │
│                                                          │
└─────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────┐
│ 5. READY FOR IMPLEMENTATION                            │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ PATCH /api/documents/:id                              │
│ {                                                        │
│   status: "READY_FOR_IMPLEMENTATION"                  │
│ }                                                        │
│                                                          │
│ Triggered Actions:                                      │
│ ├─ Document RAG indexed (pgvector embeddings)         │
│ ├─ Knowledge base updated                              │
│ ├─ Requirement generation can now be triggered        │
│ └─ DocumentAIReview finalized                         │
│                                                          │
│ At this point:                                          │
│ ├─ Document cannot be edited (read-only)              │
│ ├─ Requirements can be generated from it              │
│ └─ Semantic search available                          │
│                                                          │
└─────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────┐
│ 6. FINAL (ARCHIVED)                                    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ PATCH /api/documents/:id                              │
│ {                                                        │
│   status: "FINAL"                                     │
│ }                                                        │
│                                                          │
│ Terminal state - document archived for reference      │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Document AI Review Details

```typescript
interface DocumentAIReview {
  score: number;              // 0-100 overall quality
  summary: string;            // Executive summary

  // Gaps identified
  gaps: Array<{
    gap: string;              // What's missing
    suggestion: string;       // How to fix
    priority: "LOW" | "MEDIUM" | "HIGH"
  }>;

  // Risks identified
  risks: Array<{
    risk: string;
    severity: "LOW" | "MEDIUM" | "HIGH"
    mitigation: string;
    affectedArea: string;     // Which pillar (scope, design, etc.)
  }>;

  // Overall assessment
  suggestions: string[];      // Ranked improvement suggestions
  generatedAt: Date;
  aiProvider: string;         // Which AI generated this
}
```

---

## Requirements Domain

### Requirement Lifecycle

**Status Flow**: `DRAFT` → `PUBLISHED` → `NEEDS_REVISION` → `READY` → `APPROVED` → `BACKLOGGED` → `COMPLETED`

#### Detailed Workflow

```
┌──────────────────────────────────────────────────────────┐
│ 1. CREATE REQUIREMENT (DRAFT)                            │
├──────────────────────────────────────────────────────────┤
│                                                           │
│ POST /api/requirements                                  │
│ {                                                         │
│   title: "User authentication with OAuth2",             │
│   content: "As a user, I want to log in with Google",  │
│   sourceDocumentId: "doc-uuid",  // Optional            │
│   parentId?: "parent-req-uuid",   // If part of epic   │
│   acceptanceCriteria: [                                 │
│     "Google OAuth button visible on login page",        │
│     "User profile synced with Google account",          │
│     "Existing emails migrated correctly"                │
│   ],                                                     │
│   tags: ["auth", "security", "frontend"],              │
│   priority: "HIGH"                                      │
│ }                                                         │
│                                                           │
│ Response:                                                │
│ {                                                         │
│   id: "req-uuid",                                       │
│   status: "DRAFT",                                      │
│   rqs: null,  // Not yet analyzed                       │
│   createdAt: "2025-12-12T10:00:00Z"                    │
│ }                                                         │
│                                                           │
└──────────────────────────────────────────────────────────┘
         ↓
┌──────────────────────────────────────────────────────────┐
│ 2. ANALYZE REQUIREMENT (RQS Scoring)                    │
├──────────────────────────────────────────────────────────┤
│                                                           │
│ POST /api/requirements/:id/analyze                      │
│                                                           │
│ AI Analysis (5 dimensions):                              │
│ ├─ Clarity (0-100)                                      │
│ │  └─ "Is requirement clearly worded?"                 │
│ ├─ Completeness (0-100)                                │
│ │  └─ "Are all details present?"                       │
│ ├─ Testability (0-100)                                 │
│ │  └─ "Can this be validated/tested?"                 │
│ ├─ Consistency (0-100)                                 │
│ │  └─ "Aligns with other requirements?"               │
│ └─ Overall Score = AVG(clarity, completeness, ...) × 100 │
│                                                           │
│ Response: RQSScore                                      │
│ {                                                         │
│   score: 82,  // 0-100                                 │
│   clarity: 85,                                          │
│   completeness: 78,                                     │
│   testability: 88,                                      │
│   consistency: 80,                                      │
│   feedback: "Good requirement, consider adding...",    │
│   suggestions: [                                        │
│     "Add specific SLA for OAuth response time",        │
│     "Clarify error handling for Google API failures"   │
│   ]                                                      │
│ }                                                         │
│                                                           │
│ Status: NEEDS_REVISION (if score < 75)                 │
│         READY (if score ≥ 75)                          │
│                                                           │
└──────────────────────────────────────────────────────────┘
         ↓
┌──────────────────────────────────────────────────────────┐
│ 3. REVIEW & IMPROVE (if NEEDS_REVISION)                 │
├──────────────────────────────────────────────────────────┤
│                                                           │
│ User updates requirement based on RQS feedback         │
│                                                           │
│ PATCH /api/requirements/:id                            │
│ {                                                         │
│   content: "Improved description...",                   │
│   acceptanceCriteria: [...updated...]                  │
│ }                                                         │
│                                                           │
│ Optionally re-analyze to see improvement               │
│ → RQS score increases                                   │
│ → Status transitions to READY when score ≥ 75          │
│                                                           │
└──────────────────────────────────────────────────────────┘
         ↓
┌──────────────────────────────────────────────────────────┐
│ 4. PUBLISH REQUIREMENT (PUBLISHED)                      │
├──────────────────────────────────────────────────────────┤
│                                                           │
│ PATCH /api/requirements/:id                            │
│ {                                                         │
│   status: "PUBLISHED"                                  │
│ }                                                         │
│                                                           │
│ Requirement visible to team, ready for refinement      │
│                                                           │
└──────────────────────────────────────────────────────────┘
         ↓
┌──────────────────────────────────────────────────────────┐
│ 5. APPROVE REQUIREMENT (APPROVED)                       │
├──────────────────────────────────────────────────────────┤
│                                                           │
│ POST /api/requirements/:id/approve                     │
│                                                           │
│ This is the KEY transition:                             │
│ ├─ Unlocks task generation                             │
│ ├─ Makes requirement eligible for sprint               │
│ └─ RQS score finalized (no more changes ideally)      │
│                                                           │
│ Triggered: RequirementApproved event                  │
│   ↓                                                      │
│   RequirementApprovedSubscriber (100ms SLA)            │
│   ├─ AI generates implementation tasks                 │
│   ├─ SprintItem[] created                              │
│   ├─ Tasks linked to requirement                       │
│   └─ Requirement status: APPROVED + tasks available    │
│                                                           │
│ Response:                                                │
│ {                                                         │
│   id: "req-uuid",                                       │
│   status: "APPROVED",                                  │
│   tasks: [  // Generated tasks                         │
│     {                                                    │
│       id: "task-uuid-1",                               │
│       title: "Implement Google OAuth button (FE)",     │
│       type: "FEATURE",                                 │
│       estimatedHours: 8,                               │
│       storyPoints: 5                                   │
│     },                                                   │
│     {                                                    │
│       id: "task-uuid-2",                               │
│       title: "Create OAuth handler endpoint (BE)",     │
│       type: "FEATURE",                                 │
│       estimatedHours: 16,                              │
│       storyPoints: 8                                   │
│     }                                                    │
│   ]                                                      │
│ }                                                         │
│                                                           │
└──────────────────────────────────────────────────────────┘
         ↓
┌──────────────────────────────────────────────────────────┐
│ 6. MOVE TO BACKLOG (BACKLOGGED)                         │
├──────────────────────────────────────────────────────────┤
│                                                           │
│ POST /api/requirements/:id/move-tasks-backlog          │
│                                                           │
│ Moves requirement + all tasks to backlog               │
│ ├─ Requirements become backlog items                   │
│ ├─ Tasks available for sprint assignment               │
│ └─ Can now be dragged into sprints                     │
│                                                           │
│ Status: BACKLOGGED                                     │
│ Visibility: Backlog & Planning views                   │
│                                                           │
└──────────────────────────────────────────────────────────┘
         ↓
┌──────────────────────────────────────────────────────────┐
│ 7. COMPLETE REQUIREMENT (COMPLETED)                     │
├──────────────────────────────────────────────────────────┤
│                                                           │
│ When all tasks are done & tested:                       │
│                                                           │
│ PATCH /api/requirements/:id                            │
│ {                                                         │
│   status: "COMPLETED"                                  │
│ }                                                         │
│                                                           │
│ Requirement marked complete                            │
│ Included in release metrics                            │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

### RQS (Requirement Quality Score) Breakdown

```typescript
interface RQSScore {
  // Individual dimension scores (0-100)
  clarity: number;         // "Is requirement clearly stated?"
  completeness: number;    // "Are all details present?"
  testability: number;     // "Can it be tested/validated?"
  consistency: number;     // "Aligns with other requirements?"
  score: number;           // Overall average (0-100)

  // Interpretation
  rating: "EXCELLENT" | "GOOD" | "ACCEPTABLE" | "NEEDS_WORK" | "CRITICAL"

  // Methods
  isHighQuality(): boolean;        // score >= 75
  getWeakestDimension(): string;   // Which pillar to improve
  getStrongestDimension(): string; // Which pillar is best
  equals(other: RQSScore): boolean;
}

// Mapping: Score → Rating
// 90-100: EXCELLENT (ready to implement)
// 75-89:  GOOD (acceptable, minor improvements)
// 60-74:  ACCEPTABLE (needs revision)
// 40-59:  NEEDS_WORK (significant gaps)
// 0-39:   CRITICAL (not ready)
```

---

## Sprints Domain

### Sprint Lifecycle

**Status Flow**: `PLANNED` → `ACTIVE` → `COMPLETED` | `CANCELLED`

#### Detailed Workflow

```
┌────────────────────────────────────────────────────────┐
│ 1. CREATE SPRINT (PLANNED)                             │
├────────────────────────────────────────────────────────┤
│                                                         │
│ POST /api/sprints                                      │
│ {                                                       │
│   name: "Sprint 5 - User Auth",                       │
│   goal: "Implement OAuth2 authentication",            │
│   capacity: 40,  // Story points (1-1000)            │
│   startDate: "2025-12-16T00:00:00Z",                │
│   endDate: "2025-12-29T23:59:59Z",  // 2 weeks      │
│   description: "..."                                  │
│ }                                                       │
│                                                         │
│ Response:                                              │
│ {                                                       │
│   id: "sprint-uuid",                                  │
│   status: "PLANNED",                                  │
│   items: [],  // Empty initially                      │
│   metrics: {                                           │
│     totalItems: 0,                                    │
│     completedItems: 0,                                │
│     capacity: 40,                                     │
│     used: 0                                           │
│   }                                                    │
│ }                                                       │
│                                                         │
└────────────────────────────────────────────────────────┘
         ↓
┌────────────────────────────────────────────────────────┐
│ 2. ADD ITEMS TO SPRINT (PLANNING)                      │
├────────────────────────────────────────────────────────┤
│                                                         │
│ User navigates to /planning (backlog view)            │
│   ├─ Backlog: All requirements + standalone tasks    │
│   ├─ Sprint: Items assigned to this sprint            │
│   └─ Drag-drop from backlog to sprint                 │
│                                                         │
│ Options:                                               │
│ 1) Manual Selection                                   │
│    └─ Drag requirements/tasks to sprint               │
│                                                         │
│ 2) AI Auto-Plan                                       │
│    POST /api/sprints/ai/plan                          │
│    {                                                    │
│      sprintId: "sprint-uuid",                         │
│      capacity: 40                                     │
│    }                                                    │
│                                                         │
│    AI Algorithm:                                       │
│    ├─ Sort by RQS score (quality first)              │
│    ├─ Sort by priority (HIGH/CRITICAL)               │
│    ├─ Estimate story points per item                 │
│    ├─ Fit items respecting capacity                  │
│    └─ Return recommendations with reasoning          │
│                                                         │
│    Response: AIPlanRecommendation                    │
│    {                                                    │
│      recommendedItems: [                             │
│        {                                              │
│          item: { id, title, rqsScore, priority },   │
│          reason: "High quality (RQS: 85) + priority" │
│          score: 92,  // Recommendation confidence    │
│          storyPoints: 8                              │
│        }                                              │
│      ],                                               │
│      totalRecommended: 5,                            │
│      capacityUtilized: 38,  // Out of 40             │
│      reasoning: "Optimized for quality & value..."   │
│    }                                                    │
│                                                         │
│ Add items:                                            │
│ POST /api/sprints/:sprintId/items                    │
│ {                                                      │
│   requirementIds: ["req-uuid-1", "req-uuid-2"],     │
│   taskIds: ["task-uuid-1"]                          │
│ }                                                      │
│                                                         │
│ SprintItem[] created for each requirement/task       │
│ Capacity validated (total story points ≤ 40)        │
│                                                         │
└────────────────────────────────────────────────────────┘
         ↓
┌────────────────────────────────────────────────────────┐
│ 3. START SPRINT (ACTIVE)                               │
├────────────────────────────────────────────────────────┤
│                                                         │
│ POST /api/sprints/:id/start                          │
│                                                         │
│ Validations:                                           │
│ ├─ Cannot start empty sprint                         │
│ ├─ Cannot have multiple ACTIVE sprints per tenant    │
│ ├─ Capacity check passed                             │
│ └─ Start date <= today <= end date                   │
│                                                         │
│ Triggered: SprintStarted event                      │
│   ├─ DomainEvent published                           │
│   ├─ SprintStartedSubscriber (500ms SLA)             │
│   │   ├─ Team notified (email/Slack)                 │
│   │   └─ Metrics initialized                         │
│   └─ Status: ACTIVE                                  │
│                                                         │
│ Now visible: Sprint Board (/sprints/[id])            │
│                                                         │
└────────────────────────────────────────────────────────┘
         ↓
┌────────────────────────────────────────────────────────┐
│ 4. EXECUTE SPRINT (KANBAN TRACKING)                    │
├────────────────────────────────────────────────────────┤
│                                                         │
│ Team uses Sprint Board to track work                  │
│                                                         │
│ 6-Column Kanban Layout:                              │
│ ┌──────┬──────┬──────┬──────┬──────┬──────┐          │
│ │ Todo │ In   │ Code │Ready │ In   │ Done │          │
│ │      │Prog  │Review│for QA│Test  │      │          │
│ └──────┴──────┴──────┴──────┴──────┴──────┘          │
│                                                         │
│ Team drags items across columns:                     │
│   1. Picks item from "Todo"                          │
│   2. Moves to "In Progress"                          │
│   3. → Opens PR/MR → "Code Review"                   │
│   4. → PR approved → "Ready for QA"                  │
│   5. → QA testing → "In Testing"                     │
│   6. → All tests pass → "Done"                       │
│                                                         │
│ API: PATCH /api/sprints/:id/items/:itemId/status    │
│ {                                                      │
│   status: "in_progress" | "code_review" | ...       │
│ }                                                      │
│                                                         │
│ Real-time Updates:                                    │
│ ├─ Progress %: done / total items                    │
│ ├─ By Priority: CRITICAL/HIGH/MEDIUM/LOW breakdown  │
│ ├─ By Type: Feature/Bug/Task breakdown              │
│ ├─ Avg RQS: Average quality of items                │
│ ├─ Burndown: Items completed/day vs. planned        │
│ └─ Velocity: Estimate for future sprints            │
│                                                         │
└────────────────────────────────────────────────────────┘
         ↓
┌────────────────────────────────────────────────────────┐
│ 5. COMPLETE SPRINT                                     │
├────────────────────────────────────────────────────────┤
│                                                         │
│ POST /api/sprints/:id/complete                       │
│                                                         │
│ Final Actions:                                        │
│ ├─ Mark all items as DONE (if not already)          │
│ ├─ Calculate final metrics                           │
│ ├─ Compute velocity (story points completed)         │
│ ├─ Archive sprint data                               │
│ └─ Status: COMPLETED                                 │
│                                                         │
│ Triggered: SprintCompleted event                    │
│   ├─ SprintCompletedSubscriber (1000ms SLA)          │
│   ├─ Velocity calculated for forecasting             │
│   ├─ Sprint review data generated                    │
│   └─ Team notified with retrospective data           │
│                                                         │
│ Response: SprintMetrics                              │
│ {                                                      │
│   sprintId: "sprint-uuid",                           │
│   total: 10,                                          │
│   completed: 9,                                       │
│   inProgress: 1,                                      │
│   todo: 0,                                            │
│   progress: 90,                                       │
│   velocity: 38,  // Story points completed           │
│   byPriority: {                                       │
│     critical: 2,                                      │
│     high: 4,                                          │
│     medium: 3,                                        │
│     low: 1                                            │
│   },                                                   │
│   byType: {                                           │
│     feature: 6,                                       │
│     bug: 2,                                           │
│     task: 2                                           │
│   },                                                   │
│   avgRqsScore: 82,  // Quality metric                │
│   burndownData: [                                     │
│     { day: 1, planned: 40, actual: 35 },            │
│     { day: 2, planned: 30, actual: 32 },            │
│     // ... more days                                 │
│     { day: 10, planned: 0, actual: 2 }              │
│   ]                                                    │
│ }                                                      │
│                                                         │
└────────────────────────────────────────────────────────┘
```

### Sprint Item Status Transitions

```
                    ┌─────────┐
                    │ BACKLOG │
                    └────┬────┘
                         │
              ┌──────────┴───────────┐
              │                      │
              ▼                      ▼
         ┌────────┐           ┌──────────┐
         │  TODO  │◄─────────►│ IN_PROGRESS
         └────────┘           └──────────┘
             │                      │
             │                      ├─────────┐
             │                      │         │
             │          ┌───────────┘         │
             │          ▼                     │
             │    ┌──────────────┐            │
             │    │ CODE_REVIEW  │            │
             │    └──────────────┘            │
             │          │                     │
             │          └─────────────┐       │
             │                        │       │
             │    ┌──────────────┐    │       │
             │    │ READY_FOR_QA │◄───┴───────┘
             │    └──────────────┘    │
             │          │             │
             └─────┬────┴─────────────┘
                   │
                   ▼
            ┌────────────┐
            │ IN_TESTING │
            └─────┬──────┘
                  │
                  ▼
              ┌──────┐
              │ DONE │
              └──────┘
```

---

## Releases Domain

### Release Lifecycle

**Status Flow**: `PLANNED` → `ACTIVE` → `FROZEN` → `RELEASED` | `BLOCKED` | `ABORTED`

#### Detailed Workflow

```
┌────────────────────────────────────────────────┐
│ 1. CREATE RELEASE (PLANNED)                    │
├────────────────────────────────────────────────┤
│                                                 │
│ POST /api/releases                             │
│ {                                              │
│   version: "2.5.0",  // Semantic versioning  │
│   name: "Q1 2026 Release",                    │
│   description: "User auth + performance",     │
│   targetDate: "2026-03-31",                   │
│   sprintIds: ["sprint-uuid-1", "sprint-..."] │
│ }                                              │
│                                                 │
│ Response:                                      │
│ {                                              │
│   id: "release-uuid",                         │
│   status: "PLANNED",                          │
│   version: "2.5.0",                           │
│   rcsScore: null  // Not yet evaluated        │
│ }                                              │
│                                                 │
└────────────────────────────────────────────────┘
         ↓
┌────────────────────────────────────────────────┐
│ 2. EVALUATE READINESS (RCS Calculation)       │
├────────────────────────────────────────────────┤
│                                                 │
│ POST /api/releases/:id/evaluate                │
│                                                 │
│ Anti-Corruption Layer (ReleaseReadinessAdapter)
│ gathers data from 4 contexts:                  │
│                                                 │
│ ├─ Test Context (40% weight)                  │
│ │  ├─ Total test cases in sprints             │
│ │  ├─ Tests passed vs. total                  │
│ │  ├─ Pass rate calculation                   │
│ │  ├─ Gate: Pass rate ≥ 80%                  │
│ │  └─ QT Score (0-100)                       │
│ │                                              │
│ ├─ Bugs Context (30% weight)                  │
│ │  ├─ Count by severity (CRITICAL, HIGH, ...) │
│ │  ├─ P0/P1 priority blocking logic           │
│ │  ├─ Gate: Zero CRITICAL/P0 bugs             │
│ │  └─ B Score (0-100)                        │
│ │                                              │
│ ├─ Requirements Context (20% weight)          │
│ │  ├─ Requirements in release                 │
│ │  ├─ Average RQS score (0-100)               │
│ │  ├─ % of reqs with RQS ≥ 75                │
│ │  ├─ Gate: RP ≥ 70%                         │
│ │  └─ RP Score (0-100)                       │
│ │                                              │
│ └─ Security Context (10% weight)              │
│    ├─ Security scan results                   │
│    ├─ Vulnerability count                     │
│    ├─ Gate: No critical vulns                │
│    └─ SO Score (0-100)                       │
│                                                 │
│ RCS Calculation:                               │
│ RCS = (QT × 0.4) + (B × 0.3) + (RP × 0.2) + (SO × 0.1) │
│                                                 │
│ Example: (90 × 0.4) + (100 × 0.3) + (70 × 0.2) + (95 × 0.1) │
│        = 36 + 30 + 14 + 9.5 = 89.5            │
│                                                 │
│ Response: ReleaseConfidenceScore              │
│ {                                              │
│   totalScore: 89.5,                           │
│   status: "READY",  // READY|WARNING|BLOCKED  │
│   pillars: {                                   │
│     quality: { score: 90, weight: 0.4 },      │
│     bugs: { score: 100, weight: 0.3 },        │
│     requirements: { score: 70, weight: 0.2 }, │
│     security: { score: 95, weight: 0.1 }      │
│   },                                           │
│   gates: {                                     │
│     rcsMin75: true,      // ✓ 89.5 ≥ 75      │
│     testCoverage80: true, // ✓ 90% ≥ 80%     │
│     noCriticalBugs: true, // ✓ 0 critical    │
│     securityPassed: true  // ✓ Scans OK      │
│   },                                           │
│   blockingReasons: [],  // Empty = no blocks  │
│   recommendations: [    // Improvements       │
│     "Consider testing the edge case..."       │
│   ]                                            │
│ }                                              │
│                                                 │
│ Status Transitions:                            │
│ ├─ If RCS ≥ 75 & all gates pass → READY      │
│ ├─ If RCS 60-74 or some gates fail → WARNING  │
│ └─ If RCS < 60 or critical gates fail → BLOCKED │
│                                                 │
└────────────────────────────────────────────────┘
         ↓ (if READY)
┌────────────────────────────────────────────────┐
│ 3. ACTIVATE RELEASE (ACTIVE)                   │
├────────────────────────────────────────────────┤
│                                                 │
│ POST /api/releases/:id/activate                │
│                                                 │
│ Validations:                                   │
│ ├─ Status must be PLANNED                     │
│ └─ RCS status must be READY (or override)     │
│                                                 │
│ Status: ACTIVE                                │
│ Meaning: Release approved, preparing to ship  │
│                                                 │
└────────────────────────────────────────────────┘
         ↓
┌────────────────────────────────────────────────┐
│ 4. FREEZE RELEASE (FROZEN)                     │
├────────────────────────────────────────────────┤
│                                                 │
│ POST /api/releases/:id/freeze                  │
│                                                 │
│ Validations:                                   │
│ ├─ Status must be ACTIVE                      │
│ └─ No new commits allowed                     │
│                                                 │
│ Status: FROZEN                                │
│ Meaning: Code locked, final testing/staging   │
│                                                 │
└────────────────────────────────────────────────┘
         ↓
┌────────────────────────────────────────────────┐
│ 5. RELEASE TO PRODUCTION (RELEASED)            │
├────────────────────────────────────────────────┤
│                                                 │
│ POST /api/releases/:id/release                 │
│                                                 │
│ Validations:                                   │
│ ├─ Status must be FROZEN                      │
│ └─ Final RCS check (must be READY)            │
│                                                 │
│ Status: RELEASED (Terminal)                   │
│ Meaning: In production, monitoring active     │
│                                                 │
│ Triggered: ReleaseReadinessAchieved event    │
│   ├─ ReleaseReadinessAchievedSubscriber       │
│   ├─ Deployment workflows triggered           │
│   └─ Monitoring dashboards activated          │
│                                                 │
│ Cannot be reverted (immutable)                │
│                                                 │
└────────────────────────────────────────────────┘
         │
         ├─ (if issues found) ▼
         │  ┌────────────────────────────┐
         │  │ ROLLBACK (manual process)  │
         │  └────────────────────────────┘
         │
         └─ (eventual) ▼
            ┌────────────────────────────┐
            │ ARCHIVED (historical)      │
            └────────────────────────────┘
```

### If RCS Check FAILS → BLOCKED

```
┌─────────────────────────────────────────┐
│ RELEASE BLOCKED - Fix Issues            │
├─────────────────────────────────────────┤
│                                          │
│ If readiness gates not met:             │
│ ├─ RCS < 75                             │
│ ├─ Test coverage < 80%                  │
│ ├─ Critical bugs found                  │
│ └─ Security scan failed                 │
│                                          │
│ POST /api/releases/:id/block             │
│                                          │
│ Status: BLOCKED (can retry)             │
│                                          │
│ Response includes:                      │
│ {                                        │
│   blockingReasons: [                    │
│     "3 critical bugs must be fixed",    │
│     "Test coverage only 72%, need 80%"  │
│   ],                                    │
│   recommendations: [                    │
│     "Triage and fix bugs in parallel",  │
│     "Run additional test suite XYZ"     │
│   ]                                     │
│ }                                        │
│                                          │
│ Team fixes issues, re-evaluates:        │
│ POST /api/releases/:id/evaluate          │
│   → RCS recalculated                    │
│   → Bugs fixed → RCS improves           │
│   → Tests added → Coverage improves     │
│   → Status: READY (gates pass)          │
│   → Can now retry RELEASE               │
│                                          │
└─────────────────────────────────────────┘
```

---

## Bugs Domain

### Bug Lifecycle

**Status Flow**: `OPEN` → `TRIAGED` → `IN_PROGRESS` → `RESOLVED` → `VERIFIED` → `CLOSED` | `DEFERRED` | `INVALID`

#### Detailed Workflow

```
┌──────────────────────────────────────────────┐
│ 1. REPORT BUG (OPEN)                         │
├──────────────────────────────────────────────┤
│                                              │
│ POST /api/bugs                               │
│ {                                            │
│   title: "Login button not visible on...",  │
│   description: "Reported by QA...",         │
│   stepsToReproduce: [...],                  │
│   attachments: [...],  // Screenshots       │
│   reportedBy: "qa-user-uuid",               │
│   severity: null,  // Not yet assigned      │
│   priority: null                            │
│ }                                            │
│                                              │
│ Response:                                    │
│ {                                            │
│   id: "bug-uuid",                           │
│   status: "OPEN",                           │
│   createdAt: "2025-12-12T10:00:00Z"        │
│ }                                            │
│                                              │
└──────────────────────────────────────────────┘
         ↓
┌──────────────────────────────────────────────┐
│ 2. AI TRIAGE (TRIAGED)                      │
├──────────────────────────────────────────────┤
│                                              │
│ POST /api/bugs/:id/triage                   │
│                                              │
│ AI Analysis:                                │
│ ├─ Title + description analyzed             │
│ ├─ Severity assigned:                       │
│ │  ├─ CRITICAL: Blocks release/production   │
│ │  ├─ HIGH: Major feature broken            │
│ │  ├─ MEDIUM: Workaround exists             │
│ │  └─ LOW: Minor issue, cosmetic           │
│ ├─ Priority assigned:                       │
│ │  ├─ P0: Urgent (fix immediately)         │
│ │  ├─ P1: High (fix this sprint)           │
│ │  ├─ P2: Medium (backlog)                 │
│ │  └─ P3: Low (nice to have)               │
│ ├─ Impact score: 0-100                      │
│ │  └─ Combines severity + priority          │
│ └─ Suggested assignee                       │
│                                              │
│ Response:                                    │
│ {                                            │
│   id: "bug-uuid",                           │
│   status: "TRIAGED",                        │
│   severity: "HIGH",                         │
│   priority: "P1",                           │
│   impactScore: 85,                          │
│   reasoning: "Feature-blocking, should fix...",│
│   suggestedAssignee: "dev-uuid"             │
│ }                                            │
│                                              │
│ Triggered: BugTriaged event                │
│   ├─ BugTriagedSubscriber (300ms SLA)       │
│   ├─ Impact on release updated              │
│   └─ Team notifications sent                │
│                                              │
│ ⚠️ If CRITICAL or P0:                       │
│    ├─ Blocks release automatically          │
│    ├─ ReleaseConfidenceScore updated        │
│    └─ Stakeholders notified                 │
│                                              │
└──────────────────────────────────────────────┘
         ↓
┌──────────────────────────────────────────────┐
│ 3. IN PROGRESS (IN_PROGRESS)                 │
├──────────────────────────────────────────────┤
│                                              │
│ PATCH /api/bugs/:id                         │
│ {                                            │
│   status: "IN_PROGRESS",                   │
│   assignedTo: "dev-uuid"                    │
│ }                                            │
│                                              │
│ Developer works on fix                      │
│ Linked to PR/commit for tracking            │
│                                              │
└──────────────────────────────────────────────┘
         ↓
┌──────────────────────────────────────────────┐
│ 4. RESOLVED (RESOLVED)                       │
├──────────────────────────────────────────────┤
│                                              │
│ PATCH /api/bugs/:id                         │
│ {                                            │
│   status: "RESOLVED",                      │
│   fixedInBuild: "v2.5.1",                  │
│   resolutionNotes: "Fixed CSS override..."  │
│ }                                            │
│                                              │
│ PR/commit merged, fix deployed to staging   │
│                                              │
│ Triggered: BugResolved event               │
│   ├─ BugResolvedSubscriber (200ms SLA)      │
│   ├─ QA verification created                │
│   └─ ReleaseConfidenceScore recalculated    │
│                                              │
└──────────────────────────────────────────────┘
         ↓
┌──────────────────────────────────────────────┐
│ 5. VERIFIED (VERIFIED)                       │
├──────────────────────────────────────────────┤
│                                              │
│ QA tests fix in staging environment         │
│                                              │
│ PATCH /api/bugs/:id                         │
│ {                                            │
│   status: "VERIFIED",                      │
│   verifiedBy: "qa-uuid",                    │
│   verificationNotes: "Confirmed fixed...",  │
│   verificationDate: "2025-12-13"            │
│ }                                            │
│                                              │
│ Fix ready for production                    │
│                                              │
└──────────────────────────────────────────────┘
         ↓
┌──────────────────────────────────────────────┐
│ 6. CLOSED (CLOSED) - Terminal               │
├──────────────────────────────────────────────┤
│                                              │
│ PATCH /api/bugs/:id                         │
│ {                                            │
│   status: "CLOSED"                         │
│ }                                            │
│                                              │
│ Fix deployed to production                  │
│ No further modifications allowed             │
│                                              │
│ ReleaseConfidenceScore updated:             │
│ ├─ If was CRITICAL/P0 → now passed         │
│ └─ RCS score may improve                   │
│                                              │
└──────────────────────────────────────────────┘
```

### Alternative Bug Paths

```
TRIAGED
  ├─ → DEFERRED (Terminal)
  │  └─ "Won't fix in this release"
  │     └─ ReleaseConfidenceScore updates
  │
  ├─ → INVALID (Terminal)
  │  └─ "Not a bug, working as designed"
  │     └─ ReleaseConfidenceScore unaffected
  │
  └─ → REOPENED (back to TRIAGED)
     └─ "QA found it still broken"
        └─ New investigation cycle
```

---

## Cross-Domain Interactions

### Requirements → Sprints → Release Flow

```
1. Requirement APPROVED
   ├─ RQS score finalized (e.g., 85)
   └─ Tasks generated (3-5 implementation tasks)

2. Requirement BACKLOGGED
   ├─ Available for sprint planning
   └─ Tasks visible in backlog

3. Sprint PLANNED & items added
   ├─ Requirement + tasks linked
   └─ Status: Available for ACTIVE sprint

4. Sprint STARTED
   ├─ Team begins tracking
   └─ Kanban board shows item statuses

5. Sprint COMPLETED
   ├─ All items marked DONE
   ├─ Velocity calculated (story points)
   └─ Metrics: 9/10 items (90%), avg RQS 84

6. Release created with sprint items
   ├─ Includes this requirement
   └─ Contributes to RCS calculation

7. Release Readiness evaluated
   ├─ Requirement pillar (20%):
   │  ├─ Total reqs in release: 25
   │  ├─ Avg RQS: (85 + 79 + 82 + ... ) / 25 = 81
   │  └─ RP = 81 (already high quality)
   └─ RCS recalculated: May increase release readiness
```

### Bugs Impact on Release

```
Bug reported: "Login broken after OAuth changes"
├─ Status: OPEN
├─ Reported during sprint execution

Bug triaged:
├─ Severity: CRITICAL
├─ Priority: P0
├─ Status: TRIAGED
├─ Impact Score: 98 (blocks release)
└─ Automatically linked to release

Release Readiness Check:
├─ Before bug: RCS = 89.5 (READY)
├─ BugMetrics from anti-corruption layer:
│  ├─ Total bugs: 2
│  ├─ CRITICAL count: 1  ← NEW
│  └─ Bug Pillar fails gate: "No CRITICAL bugs"
└─ After bug: RCS = BLOCKED (gates fail)

Team Action:
├─ Fix bug immediately (P0 priority)
├─ Deploy to staging
├─ QA verifies fix
└─ Re-evaluate release readiness

After fix (bug status VERIFIED):
├─ BugMetrics updated:
│  └─ CRITICAL count: 0
├─ Release gates now pass
└─ RCS recalculated: Back to READY
```

---

## Summary: State Machine Overview

| Domain | States | Triggers | Key Events |
|--------|--------|----------|------------|
| **Documents** | DRAFT→IN_REVIEW→AI_ANALYZING→FIXING_GAPS→READY→FINAL | User actions + AI analysis | DocumentAnalyzed, StatusChanged |
| **Requirements** | DRAFT→PUBLISHED→NEEDS_REVISION→READY→APPROVED→BACKLOGGED→COMPLETED | User approval, RQS score, task generation | RequirementApproved, RequirementAnalyzed |
| **Sprints** | PLANNED→ACTIVE→COMPLETED | Item addition, team actions | SprintStarted, SprintCompleted |
| **Releases** | PLANNED→ACTIVE→FROZEN→RELEASED | Readiness gates, team decisions | ReleaseReadinessAchieved, ReleaseBlocked |
| **Bugs** | OPEN→TRIAGED→IN_PROGRESS→RESOLVED→VERIFIED→CLOSED | AI triage, team work, QA validation | BugTriaged, BugResolved |

This comprehensive guide ensures all domain workflows are understood, documented, and aligned with the actual implementation.
