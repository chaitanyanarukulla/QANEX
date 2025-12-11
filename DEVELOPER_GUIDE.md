# QANexus Developer Guide

This guide is intended for developers contributing to the QANexus codebase. It covers the system architecture, module responsibilities, API reference, and extensibility patterns.

---

## 1. Architecture Overview

QANexus follows a **modular monolith** architecture built on NestJS. It uses a clear separation of concerns with a shared core for cross-cutting concerns (Auth, Tenants, Database).

### High-Level Data Flow

```ascii
+-------------+      +-------------+      +-------------+
|  Next.js    |      | NestJS API  |      |  PostgreSQL |
| (Frontend)  | ---> | (Backend)   | ---> | (DB + Vect) |
+-------------+      +-------------+      +-------------+
       ^                    |
       |                    v
       |             +----------------+
       |             |   AI Factory   |
       +-------------+ (OpenAI/Local) |
                     +----------------+
```

### Key Architectural Concepts
- **Multi-Tenancy**: All data entities (except Users and Tenants themselves) have a `tenantId`. Services must always filter by `tenantId` to prevent data leaks.
- **AI Factory**: The `AiModule` abstracts LLM providers. The rest of the app asks for "Analysis" or "Embedding", and the factory routes it to OpenAI, Gemini, or Foundry Local based on tenant config.
- **RAG (Retrieval-Augmented Generation)**: We use `pgvector` to store embeddings for Requirements and Bugs. The `DocumentsAiService` handles vector search.

---

## 2. Module Breakdown (`apps/api/src`)

| Module | Responsibility |
|--------|----------------|
| `auth` | JWT issuance, verification, and RBAC guards (`JwtAuthGuard`, `RolesGuard`). |
| `tenants` | Tenant creation and isolation logic. |
| `requirements` | CRUD for requirements + AI Quality Scoring logic. |
| `bugs` | Defect tracking and Triage AI agent. |
| `test-keys` | Core test management (Cases, Runs, Results). |
| `ai` | The "brain" of the app. Contains `FoundryLocalProvider`, `OpenAiProvider`, etc. |
| `metrics` | Tracks AI token usage and costs. |

---

## 3. API Reference

### Authentication (`/api/auth`)
- `POST /login`: Exchange credentials (email/sub) for a JWT.
- `GET /me`: Get current user context.

### Requirements (`/api/requirements`)
- `POST /`: Create a new requirement.
- `GET /`: List all requirements for current tenant.
- `GET /:id`: Get single requirement details.
- `POST /:id/analyze`: **[AI]** Trigger quality analysis. Returns suggestions.

### Bugs (`/api/bugs`)
- `POST /`: Report a bug.
- `GET /`: List bugs.
- `PATCH /:id`: Update bug status/assignee.
- `POST /:id/triage`: **[AI]** Analyze bug description to suggest Severity/Priority.

### Test Management (`/api/tests`)
- **Cases**:
  - `POST /cases`: Create a test case.
  - `GET /cases`: List test cases.
- **Runs**:
  - `POST /runs`: Create a new test execution run.
  - `POST /runs/:id/start`: Mark run as 'In Progress'.
  - `POST /runs/:runId/results`: Record a pass/fail result for a specific case.

---

## 4. Extensibility Guide

### Adding a New Module
1. **Generate**: `nest g module my-feature` inside `apps/api/src`.
2. **Entity**: Create `my-feature.entity.ts`. **Important**: Keep `tenantId` distinct.
3. **Service**: Ensure every method accepts `tenantId` as the last argument.
4. **Controller**: Use `@UseGuards(JwtAuthGuard, RolesGuard)` and extracting `req.user.tenantId`.

### Adding a New AI Provider
1. Implement `AiProviderInterface` in `apps/api/src/ai/providers`.
2. Register it in `AiModule` factory.
3. Add configuration keys in `AiConfig`.

---

## 5. Development Hints
- **Migrations**: We use TypeORM `synchronize: true` for dev. For prod, use migrations.
- **Logging**: Use the injected `WinstonLogger` rather than `console.log`.
- **Environment**: Always check `.env.example` when pulling fresh code.
