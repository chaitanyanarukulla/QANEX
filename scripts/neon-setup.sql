-- ============================================
-- QANexus - Neon Database Setup Script
-- ============================================
-- Run this script after creating your Neon database
--
-- Steps:
-- 1. Create a Neon account at https://neon.tech
-- 2. Create a new project (e.g., "qanexus")
-- 3. Copy the connection string
-- 4. Run this script via Neon SQL Editor or psql
-- ============================================

-- Enable required extensions (Neon supports these)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";  -- pgvector is available on Neon!

-- ============================================
-- RAG Documents Table (Vector Storage)
-- ============================================
CREATE TABLE IF NOT EXISTS rag_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('REQUIREMENT', 'BUG', 'TEST', 'RELEASE', 'SPRINT')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    embedding VECTOR(1536),  -- OpenAI ada-002 dimensions
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Full-text search column for hybrid search
ALTER TABLE rag_documents
ADD COLUMN IF NOT EXISTS content_tsv tsvector
GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;

-- ============================================
-- Indexes for Performance
-- ============================================

-- Basic indexes
CREATE INDEX IF NOT EXISTS idx_rag_tenant ON rag_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rag_type ON rag_documents(type);
CREATE INDEX IF NOT EXISTS idx_rag_created ON rag_documents(created_at DESC);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_rag_content_fts ON rag_documents USING GIN(content_tsv);

-- Vector similarity index (HNSW - best for Neon)
-- Note: HNSW is faster than IVFFlat and doesn't require training
CREATE INDEX IF NOT EXISTS idx_rag_embedding_hnsw ON rag_documents
USING hnsw(embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- ============================================
-- Helper Functions
-- ============================================

-- Auto-update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger
DROP TRIGGER IF EXISTS trg_rag_updated_at ON rag_documents;
CREATE TRIGGER trg_rag_updated_at
    BEFORE UPDATE ON rag_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Hybrid Search Function
-- ============================================
-- Combines vector similarity with full-text search
-- Usage: SELECT * FROM hybrid_search('search query', '[0.1, 0.2, ...]'::vector, 'tenant-uuid');

CREATE OR REPLACE FUNCTION hybrid_search(
    query_text TEXT,
    query_embedding VECTOR(1536),
    p_tenant_id UUID,
    p_type TEXT DEFAULT NULL,
    p_limit INT DEFAULT 10,
    vector_weight FLOAT DEFAULT 0.7,
    text_weight FLOAT DEFAULT 0.3
)
RETURNS TABLE (
    id UUID,
    tenant_id UUID,
    type TEXT,
    content TEXT,
    metadata JSONB,
    vector_score FLOAT,
    text_score FLOAT,
    combined_score FLOAT
) AS $$
BEGIN
    RETURN QUERY
    WITH vector_results AS (
        SELECT
            r.id,
            1 - (r.embedding <=> query_embedding) AS v_score
        FROM rag_documents r
        WHERE r.tenant_id = p_tenant_id
          AND (p_type IS NULL OR r.type = p_type)
          AND r.embedding IS NOT NULL
        ORDER BY r.embedding <=> query_embedding
        LIMIT p_limit * 2
    ),
    text_results AS (
        SELECT
            r.id,
            ts_rank(r.content_tsv, plainto_tsquery('english', query_text)) AS t_score
        FROM rag_documents r
        WHERE r.tenant_id = p_tenant_id
          AND (p_type IS NULL OR r.type = p_type)
          AND r.content_tsv @@ plainto_tsquery('english', query_text)
        ORDER BY t_score DESC
        LIMIT p_limit * 2
    ),
    combined AS (
        SELECT
            COALESCE(v.id, t.id) AS doc_id,
            COALESCE(v.v_score, 0) AS v_score,
            COALESCE(t.t_score, 0) AS t_score,
            (COALESCE(v.v_score, 0) * vector_weight) +
            (COALESCE(t.t_score, 0) * text_weight) AS c_score
        FROM vector_results v
        FULL OUTER JOIN text_results t ON v.id = t.id
    )
    SELECT
        r.id,
        r.tenant_id,
        r.type,
        r.content,
        r.metadata,
        c.v_score::FLOAT,
        c.t_score::FLOAT,
        c.c_score::FLOAT
    FROM combined c
    JOIN rag_documents r ON r.id = c.doc_id
    ORDER BY c.c_score DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Vector-only search function (simpler)
-- ============================================
CREATE OR REPLACE FUNCTION vector_search(
    query_embedding VECTOR(1536),
    p_tenant_id UUID,
    p_type TEXT DEFAULT NULL,
    p_limit INT DEFAULT 10,
    p_min_score FLOAT DEFAULT 0.5
)
RETURNS TABLE (
    id UUID,
    tenant_id UUID,
    type TEXT,
    content TEXT,
    metadata JSONB,
    similarity FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        r.id,
        r.tenant_id,
        r.type,
        r.content,
        r.metadata,
        (1 - (r.embedding <=> query_embedding))::FLOAT AS similarity
    FROM rag_documents r
    WHERE r.tenant_id = p_tenant_id
      AND (p_type IS NULL OR r.type = p_type)
      AND r.embedding IS NOT NULL
      AND (1 - (r.embedding <=> query_embedding)) >= p_min_score
    ORDER BY r.embedding <=> query_embedding
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Verification
-- ============================================
DO $$
BEGIN
    -- Verify vector extension
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
        RAISE NOTICE '✅ pgvector extension is installed';
    ELSE
        RAISE EXCEPTION '❌ pgvector extension is NOT installed';
    END IF;

    -- Verify table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rag_documents') THEN
        RAISE NOTICE '✅ rag_documents table created';
    ELSE
        RAISE EXCEPTION '❌ rag_documents table NOT created';
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '🎉 Neon database setup complete!';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Copy your Neon connection string';
    RAISE NOTICE '2. Set DATABASE_URL in your environment';
    RAISE NOTICE '3. Run the QANexus API';
END $$;
