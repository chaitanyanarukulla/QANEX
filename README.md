# QANexus

QANexus is a multi-tenant SaaS platform for SDLC governance and quality, built on Microsoft Azure and Microsoft Foundry.

## Overview
QANexus unifies requirements authoring, backlog planning, testing lifecycles, and release governance into a single intelligence-first platform. It uses AI as an observer/auditor to provide insights without modifying your application code.

## Tech Stack
- **Frontend**: Next.js 16 (App Router), Tailwind CSS
- **Backend**: NestJS 11, Node.js 24 LTS
- **Database**: PostgreSQL
- **AI**: Microsoft Foundry + Azure AI Search
- **Infrastructure**: Docker (Local), AKS (Cloud)

## Key Features (Implemented)
- **Tenant Management**: Multi-tenant isolation with "Gold/Silver/Bronze" plans.
- **Requirements Hub**: Markdown editor with AI Quality Scoring (RQS).
- **Planning Board**: Backlog management and Sprints with AI scoping assistance.
- **Test Management**: Test Cases repository, Test Runs, and Execution tracking.
- **Test Automation**: AI-powered generation of automation scripts (Playwright/Jest) and PR creation.
- **Bug Tracking**: Full Defect lifecycle management with AI Triage (Severity/Priority suggestions).
- **Releases & Governance**: Release Confidence Score (RCS) engine for data-driven deployment gates.
- **AI & RAG**: Global semantic search and pluggable AI providers (Foundry/Mock/Local).
- **Team Management**: Role-Based Access Control (RBAC) and user management.
- **Enterprise Ready**:
  - **Audit Logging**: Comprehensive traceability.
  - **Data Export**: PDF/CSV generation.
  - **Billing Integration**: Usage limits and subscription management.
  - **Onboarding**: Guided tutorials and setup wizards.

## Getting Started

### Prerequisites
- Node.js 20+ (Node.js 24 recommended)
- Docker & Docker Compose

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

## Architecture Modules
- **Auth**: RBAC with JWT Strategy & UserTenant isolation.
- **Requirements**: Analysis & Scoring Engine.
- **Sprints**: Agile planning & capacity management.
- **TestKeys**: Comprehensive test case management.
- **Bugs**: Defect tracking with AI Triage integration.
- **Releases**: Release Confidence Score (RCS) aggregator.
- **AI**: Modular Provider pattern (Mock/Foundry) and RAG Service (pgvector).
- **Users**: Team & Member administration.
- **Projects**: Multi-project support within tenants.
- **Billing**: Plan limits enforcement and subscription gating.
- **Audit**: Compliance logging for all critical actions.
- **Export**: Data portability (PDF/CSV exports).
- **Onboarding**: Integrated "Getting Started" checklist and welcome flows.

## Configuration
QANexus uses a modular AI architecture. Configure the provider in `.env`:
```bash
# AI Provider Selection
# Options: mock, foundry, local
AI_PROVIDER=foundry

# Foundry / External LLM Settings
LLM_API_ENDPOINT=https://api.openai.com/v1/chat/completions
LLM_API_KEY=sk-...

# Local LLM Settings (if AI_PROVIDER=local)
LOCAL_LLM_BASE_URL=http://localhost:11434/v1
LOCAL_EMBEDDING_BASE_URL=http://localhost:11434/v1

# Vector Store (for RAG)
# Options: in-memory, pgvector
VECTOR_STORE=in-memory
```
