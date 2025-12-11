# QANexus

QANexus is a production-grade, multi-tenant SaaS platform for SDLC governance and quality assurance. It unifies requirements management, test planning, execution, and release governance into a single, AI-native platform.

Built with a flexible "AI Factory" architecture, QANexus supports both cloud-based LLMs (OpenAI, Gemini, Anthropic) and completely local, on-device inference (Microsoft Foundry) for maximum data privacy.

## 🚀 Key Features

- **Multi-Tenant SaaS**: Complete data isolation with "Gold/Silver/Bronze" subscription tiers.
- **AI-Powered Requirements**: Intelligence-first editor that scores requirements for clarity, completeness, and testability.
- **Smart Test Management**: Comprehensive test case repositories, test runs, and execution tracking.
- **Automated Test Generation**: AI agents that generate Playwright/Jest scripts from manual test cases.
- **Bug & Defect Lifecycle**: Full defect tracking with AI-assisted triage (Severity/Priority suggestions).
- **Release Confidence Score (RCS)**: Data-driven release gates based on requirements coverage, test results, and bug trends.
- **RAG & Semantic Search**: Ask questions across your entire project documentation and artifacts.
- **Enterprise Ready**: RBAC, Audit Logging, Data Export (PDF/CSV), and Billing integration.

## 🛠 Tech Stack

### Frontend (`apps/web`)
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4, Lucide React icons
- **State/Data**: React Hooks, Server Actions

### Backend (`apps/api`)
- **Framework**: NestJS 11
- **Runtime**: Node.js 24 LTS
- **Language**: TypeScript
- **Database**: PostgreSQL 16 with `pgvector` (for RAG embeddings)
- **ORM**: TypeORM
- **Authentication**: Passport.js (JWT Strategy) with Multi-Tenancy support

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Cloud Deployment**: Railway (API), Vercel (Web)
- **Local AI**: Microsoft Foundry (optional)

## 📋 Prerequisites

- **Node.js**: v20 or higher (v24 recommended)
- **Docker**: Desktop or Engine (required for local DB/Redis)
- **npm**: v10+

## ⚡️ Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/your-org/qanexus.git
cd qanexus
```

### 2. Infrastructure Setup (Database)
Start PostgreSQL and Redis containers:
```bash
docker-compose up -d
```
> This starts a PostgreSQL instance on port `5432` and Redis on `6379`.

### 3. Backend Setup
Configure and run the API:

```bash
cd apps/api

# Install dependencies
npm install

# Setup Environment Variables
cp .env.example .env
# Update .env with your DB credentials logic (default usually works with docker-compose)

# Run Migrations (if applicable) & Start
npm run start:dev
```
*API will run at [http://localhost:3000/api](http://localhost:3000/api)*

### 4. Frontend Setup
Configure and run the Web Interface:

```bash
cd apps/web

# Install dependencies
npm install

# Run Development Server
npm run dev
```
*Web App will run at [http://localhost:3001](http://localhost:3001)* (or port 3000 if API is on a different port).

## 🧪 Running Tests

### Backend
```bash
cd apps/api
# Unit Tests
npm run test

# E2E Tests
npm run test:e2e
```

### Frontend
```bash
cd apps/web
npm run lint
npm run build # Checks for build errors
```

## 🤖 AI Configuration

QANexus supports a "Bring Your Own Key" model for cloud providers and a "Local First" model for privacy.

**Configure in `.env`:**
```bash
# Provider Selection: openai | gemini | anthropic | foundry_local
AI_PROVIDER=openai

# OpenAI Example
OPENAI_API_KEY=sk-...

# Local AI Example (Requires Microsoft Foundry)
# AI_PROVIDER=foundry_local
# FOUNDRY_LOCAL_ENDPOINT=http://127.0.0.1:55588/v1
```

For detailed setup of Local AI, refer to the [Microsoft Foundry Local](https://github.com/microsoft/Foundry-Local) documentation.

## 📂 Project Structure

```
├── apps
│   ├── api          # NestJS Backend Application
│   │   ├── src
│   │   │   ├── ai           # AI Provider Factory & Logic
│   │   │   ├── auth         # Authentication & Guards
│   │   │   ├── requirements # Requirements Management Module
│   │   │   ├── tenants      # Multi-tenancy Isolation Logic
│   │   │   └── ...
│   │   └── test     # E2E Tests
│   └── web          # Next.js Frontend Application
│       ├── src
│       │   ├── app          # App Router Pages
│       │   ├── components   # Reusable UI Components
│       │   └── lib          # API Clients & Utilities
├── docker-compose.yml       # Local Dev Stack Definition
└── README.md                # This file
```

## 🤝 Contributing

1. **Fork** the repo on GitHub
2. **Clone** the project to your own machine
3. **Commit** changes to your own branch
4. **Push** your work back up to your fork
5. Submit a **Pull Request** so that we can review your changes

## 📄 License

Proprietary - All rights reserved.
