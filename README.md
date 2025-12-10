# QANexus

QANexus is a multi-tenant SaaS platform for SDLC governance and quality, built with a flexible AI architecture supporting both cloud and local inference.

## Overview
QANexus unifies requirements authoring, backlog planning, testing lifecycles, and release governance into a single intelligence-first platform. It uses AI as an observer/auditor to provide insights without modifying your application code.

## Tech Stack
- **Frontend**: Next.js 16 (App Router), Tailwind CSS
- **Backend**: NestJS 11, Node.js 24 LTS
- **Database**: PostgreSQL with pgvector for RAG
- **AI**: Multi-provider architecture (OpenAI, Gemini, Anthropic, Foundry Local)
- **Infrastructure**: Docker (Local), Railway/Vercel (Cloud)

## Key Features (Implemented)
- **Tenant Management**: Multi-tenant isolation with "Gold/Silver/Bronze" plans.
- **Requirements Hub**: Markdown editor with AI Quality Scoring (RQS).
- **Planning Board**: Backlog management and Sprints with AI scoping assistance.
- **Test Management**: Test Cases repository, Test Runs, and Execution tracking.
- **Test Automation**: AI-powered generation of automation scripts (Playwright/Jest) and PR creation.
- **Bug Tracking**: Full Defect lifecycle management with AI Triage (Severity/Priority suggestions).
- **Releases & Governance**: Release Confidence Score (RCS) engine for data-driven deployment gates.
- **AI & RAG**: Global semantic search with multi-provider support.
- **Team Management**: Role-Based Access Control (RBAC) and user management.
- **Enterprise Ready**:
  - **Audit Logging**: Comprehensive traceability.
  - **Data Export**: PDF/CSV generation.
  - **Billing Integration**: Usage limits and subscription management.
  - **Onboarding**: Guided tutorials and setup wizards.

## Getting Started

### Prerequisites
- Node.js 20+ (Node.js 24 recommended)
- Docker & Docker Compose (for local development)

### Development
1. Start the database:
   ```bash
   docker-compose up -d
   ```
2. Start the Backend API:
   ```bash
   cd apps/api
   npm install
   npm run start:dev
   ```
3. Start the Frontend Web App:
   ```bash
   cd apps/web
   npm install
   npm run dev
   ```

## AI Provider Configuration

QANexus supports two AI options:

### Option 1: Cloud APIs (Bring Your Own Key)

Use your own API keys with cloud providers:

| Provider | Models | Embeddings |
|----------|--------|------------|
| **OpenAI** | GPT-4o, GPT-4o-mini | text-embedding-3-small |
| **Google Gemini** | Gemini 1.5 Flash/Pro | text-embedding-004 |
| **Anthropic Claude** | Claude 3.5 Sonnet/Haiku | Uses OpenAI or Foundry Local |

Configure in `.env`:
```bash
# Default provider
AI_PROVIDER=openai  # openai | gemini | anthropic | foundry_local

# OpenAI (https://platform.openai.com/api-keys)
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# Google Gemini (https://aistudio.google.com/app/apikey)
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-1.5-flash
GEMINI_EMBEDDING_MODEL=text-embedding-004

# Anthropic Claude (https://console.anthropic.com/settings/keys)
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-3-5-haiku-20241022
```

### Option 2: Foundry Local (On-Device AI)

Run AI 100% locally with no data egress - completely free.

**Installation:**
```bash
# Windows
winget install Microsoft.FoundryLocal

# macOS
brew install microsoft/foundrylocal/foundrylocal
```

**Configuration:**
```bash
AI_PROVIDER=foundry_local
FOUNDRY_LOCAL_ENDPOINT=http://127.0.0.1:55588/v1
FOUNDRY_LOCAL_MODEL=phi-3.5-mini
FOUNDRY_LOCAL_EMBEDDING_MODEL=nomic-embed-text
```

**Supported Models:**
| Model | Parameters | Use Case |
|-------|-----------|----------|
| phi-3.5-mini | 3.8B | General purpose, fast |
| phi-4 | 14B | Higher quality |
| qwen2.5-0.5b | 0.5B | Ultra-fast, resource efficient |
| mistral-7b | 7B | Code generation |
| llama-3.2-3b | 3B | Balanced quality/speed |

### Vector Store (RAG)

```bash
# Options: pgvector | memory
VECTOR_STORE=pgvector
```

### Per-Tenant Configuration

AI provider settings can be configured per-tenant through the Settings UI at `/settings/ai`, allowing different tenants to use different providers and their own API keys.

## Architecture Modules
- **Auth**: RBAC with JWT Strategy & UserTenant isolation.
- **Requirements**: Analysis & Scoring Engine.
- **Sprints**: Agile planning & capacity management.
- **TestKeys**: Comprehensive test case management.
- **Bugs**: Defect tracking with AI Triage integration.
- **Releases**: Release Confidence Score (RCS) aggregator.
- **AI**: Multi-provider factory pattern with tenant-level configuration.
- **RAG**: pgvector-based semantic search with embedding normalization.
- **Users**: Team & Member administration.
- **Projects**: Multi-project support within tenants.
- **Billing**: Plan limits enforcement and subscription gating.
- **Audit**: Compliance logging for all critical actions.
- **Export**: Data portability (PDF/CSV exports).
- **Metrics**: AI usage tracking with cost estimation per provider/model.
- **Onboarding**: Integrated "Getting Started" checklist and welcome flows.

## AI Features

### Requirement Analysis
AI-powered quality scoring with metrics for clarity, completeness, testability, and consistency.

### Bug Triage
Automatic severity/priority suggestions and root cause hypothesis generation.

### Test Code Generation
Generate Playwright test scripts from test case definitions.

### Release Confidence Score (RCS)
AI-generated explanations of release readiness based on requirements, bugs, and test coverage.

### RAG Search
Semantic search across requirements, bugs, and documentation using vector embeddings.

## Cost Tracking

The platform tracks AI usage and estimates costs per provider/model:
- View usage at `/settings` > AI tab
- Endpoints: `GET /metrics/ai/providers`, `GET /metrics/ai/models`
- Foundry Local usage is always $0.00 (free, on-device)

## Deployment

### Railway (API)
```bash
railway up
```

### Vercel (Web)
```bash
vercel deploy
```

### Environment Variables (Production)
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secure random string for authentication
- `AI_PROVIDER` - Default AI provider
- Provider-specific API keys as needed

## License
Proprietary - All rights reserved
