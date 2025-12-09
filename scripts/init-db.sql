-- QANexus Database Initialization Script
-- This script runs on first database creation
-- Compatible with Neon (production) and local pgvector

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Create RAG documents table with vector support
CREATE TABLE IF NOT EXISTS rag_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('REQUIREMENT', 'BUG', 'TEST', 'RELEASE', 'SPRINT')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    embedding VECTOR(1536),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add full-text search support for hybrid search
ALTER TABLE rag_documents
ADD COLUMN IF NOT EXISTS content_tsv tsvector
GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;

-- Indexes for RAG performance
CREATE INDEX IF NOT EXISTS idx_rag_tenant ON rag_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rag_type ON rag_documents(type);
CREATE INDEX IF NOT EXISTS idx_rag_content_fts ON rag_documents USING GIN(content_tsv);

-- Vector index using HNSW (faster than IVFFlat for smaller datasets)
-- Note: Create after data is loaded for better performance
CREATE INDEX IF NOT EXISTS idx_rag_embedding ON rag_documents
USING hnsw(embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_rag_documents_updated_at ON rag_documents;
CREATE TRIGGER update_rag_documents_updated_at
    BEFORE UPDATE ON rag_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Hybrid search function (vector + full-text)
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

-- Grant permissions (for Neon compatibility)
-- Note: In Neon, the default user already has these permissions
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO qanexus;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO qanexus;

-- Log successful initialization
DO $$
BEGIN
    RAISE NOTICE 'QANexus database initialized successfully with pgvector and hybrid search support';
END $$;
