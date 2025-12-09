# QANexus Deployment Guide

This guide covers deploying QANexus using the **free tier stack**:
- **Frontend**: Vercel (FREE)
- **Backend**: Railway ($5 credit/month)
- **Database**: Neon PostgreSQL (FREE with pgvector)
- **AI**: Azure OpenAI (pay-per-use ~$10-50/month)

**Total Cost: ~$10-50/month** (mostly AI usage)

---

## Prerequisites

1. **Accounts to create:**
   - [Neon](https://neon.tech) - PostgreSQL database
   - [Vercel](https://vercel.com) - Frontend hosting
   - [Railway](https://railway.app) - Backend hosting
   - [GitHub](https://github.com) - Source code & CI/CD
   - [Azure](https://portal.azure.com) - Azure OpenAI (optional for AI features)

2. **Tools:**
   - Node.js 20+
   - Docker (for local development)
   - Git

---

## Step 1: Set Up Neon Database

### 1.1 Create Neon Project

1. Go to [Neon Console](https://console.neon.tech)
2. Click **New Project**
3. Name: `qanexus`
4. Region: Choose closest to your users
5. Click **Create Project**

### 1.2 Get Connection String

1. In your project dashboard, find **Connection Details**
2. Copy the connection string (looks like):
   ```
   postgres://user:password@ep-xxx-xxx-123456.us-east-1.aws.neon.tech/qanexus?sslmode=require
   ```

### 1.3 Initialize Database

1. Go to **SQL Editor** in Neon Console
2. Copy and paste contents of `scripts/neon-setup.sql`
3. Run the script

This creates:
- pgvector extension
- RAG documents table
- Hybrid search function
- Required indexes

---

## Step 2: Set Up Azure OpenAI (Optional)

> Skip this step if you want to start with mock AI provider

### 2.1 Apply for Access

1. Go to [Azure OpenAI Access Request](https://aka.ms/oai/access)
2. Fill out the form (approval takes 1-5 business days)

### 2.2 Create Azure OpenAI Resource

1. Go to [Azure Portal](https://portal.azure.com)
2. Create resource → Search "Azure OpenAI"
3. Create with:
   - Subscription: Your subscription
   - Resource Group: `qanexus-rg`
   - Region: East US (or supported region)
   - Name: `qanexus-openai`

### 2.3 Deploy Models

In Azure OpenAI Studio, deploy:

| Model | Deployment Name |
|-------|-----------------|
| gpt-4 | `gpt-4` |
| gpt-4o-mini | `gpt-4o-mini` |
| text-embedding-ada-002 | `text-embedding-ada-002` |

### 2.4 Get Credentials

From Azure OpenAI resource:
- **Endpoint**: `https://qanexus-openai.openai.azure.com/`
- **API Key**: Found in Keys and Endpoint

---

## Step 3: Deploy Backend to Railway

### 3.1 Create Railway Project

1. Go to [Railway](https://railway.app)
2. Click **New Project** → **Deploy from GitHub repo**
3. Select your QANexus repository
4. Configure root directory: `apps/api`

### 3.2 Set Environment Variables

In Railway project settings, add:

```bash
# Database
DATABASE_URL=postgres://user:password@ep-xxx.us-east-1.aws.neon.tech/qanexus?sslmode=require

# Auth
JWT_SECRET=your-secure-random-string-here
JWT_EXPIRATION=1d

# AI Provider (use 'mock' to start without Azure)
AI_PROVIDER=mock

# Azure OpenAI (if using)
AZURE_OPENAI_ENDPOINT=https://qanexus-openai.openai.azure.com/
AZURE_OPENAI_API_KEY=your-api-key
AZURE_OPENAI_API_VERSION=2024-02-15-preview
AZURE_OPENAI_DEPLOYMENT_GPT4=gpt-4
AZURE_OPENAI_DEPLOYMENT_EMBEDDING=text-embedding-ada-002

# CORS
CORS_ORIGINS=https://qanexus.vercel.app,http://localhost:3001
```

### 3.3 Deploy

Railway will automatically build and deploy using the Dockerfile.

Note your Railway URL: `https://qanexus-api-production.up.railway.app`

---

## Step 4: Deploy Frontend to Vercel

### 4.1 Import Project

1. Go to [Vercel](https://vercel.com)
2. Click **Add New** → **Project**
3. Import your GitHub repository
4. Configure:
   - Framework: Next.js
   - Root Directory: `apps/web`

### 4.2 Set Environment Variables

```bash
NEXT_PUBLIC_API_URL=https://qanexus-api-production.up.railway.app
NEXT_PUBLIC_APP_NAME=QANexus
```

### 4.3 Deploy

Click Deploy. Vercel will build and deploy your frontend.

Your app will be available at: `https://qanexus.vercel.app`

---

## Step 5: Configure CI/CD

### 5.1 GitHub Secrets

Add these secrets to your GitHub repository:

| Secret | Value |
|--------|-------|
| `RAILWAY_TOKEN` | Get from Railway account settings |
| `VERCEL_TOKEN` | Get from Vercel account settings |
| `VERCEL_ORG_ID` | Get from Vercel project settings |
| `VERCEL_PROJECT_ID` | Get from Vercel project settings |

### 5.2 Enable Workflows

The CI/CD workflow in `.github/workflows/ci.yml` will:
1. Run linting and tests on every PR
2. Build and deploy to Railway (API) on merge to main
3. Build and deploy to Vercel (Web) on merge to main

---

## Local Development

### Quick Start

```bash
# 1. Start database
docker-compose up -d

# 2. Start API
cd apps/api
cp .env.example .env
# Edit .env with your Neon DATABASE_URL
npm install
npm run start:dev

# 3. Start Web (new terminal)
cd apps/web
cp .env.example .env.local
npm install
npm run dev
```

### Access Points

- **Web**: http://localhost:3001
- **API**: http://localhost:3000
- **Health Check**: http://localhost:3000/health

---

## Verify Deployment

### Health Check

```bash
curl https://your-api-url.railway.app/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "service": "qanexus-api"
}
```

### Readiness Check

```bash
curl https://your-api-url.railway.app/health/ready
```

Expected response:
```json
{
  "status": "ok",
  "checks": {
    "database": { "status": "ok" },
    "pgvector": { "status": "ok", "message": "v0.5.1" }
  }
}
```

---

## Troubleshooting

### Database Connection Issues

1. Check Neon connection string format
2. Ensure `?sslmode=require` is in URL
3. Check Railway environment variables

### AI Features Not Working

1. Verify `AI_PROVIDER` is set correctly
2. Check Azure OpenAI credentials
3. Start with `AI_PROVIDER=mock` to test without AI

### CORS Errors

1. Add your frontend URL to `CORS_ORIGINS`
2. Restart Railway deployment

---

## Cost Optimization

| Service | Free Tier Limit | When to Upgrade |
|---------|-----------------|-----------------|
| Neon | 512MB storage | > 500K records |
| Railway | $5/month credit | High traffic |
| Vercel | 100GB bandwidth | Heavy usage |
| Azure OpenAI | Pay-per-use | Based on AI calls |

**Tips:**
- Use `AI_PROVIDER=mock` for development
- Enable Neon auto-suspend for dev databases
- Use Railway's sleep feature for staging environments
