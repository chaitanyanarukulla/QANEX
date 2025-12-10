import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { RagBackend, RagItem } from './rag.service';
import { AiProviderFactory } from './providers';

/**
 * PgVector RAG Adapter
 * Uses the new AI provider architecture for embeddings
 * Supports all providers: OpenAI, Gemini, Anthropic (via fallback), and Foundry Local
 * Uses PostgreSQL with pgvector extension for vector storage
 *
 * Data Locality:
 * - When using Foundry Local, all embeddings are generated on-device
 * - No data leaves the user's machine when configured for local inference
 */
@Injectable()
export class PgVectorRagAdapter implements RagBackend {
  private readonly logger = new Logger(PgVectorRagAdapter.name);
  private tableInitialized = false;

  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => AiProviderFactory))
    private readonly aiProviderFactory: AiProviderFactory,
  ) {}

  /**
   * Generate embeddings using the tenant's configured provider
   */
  private async generateEmbedding(
    text: string,
    tenantId: string,
  ): Promise<number[] | null> {
    try {
      const result = await this.aiProviderFactory.generateEmbeddings(tenantId, [
        text,
      ]);
      return result.embeddings[0] || null;
    } catch (err) {
      this.logger.error('Failed to generate embedding', err);
      return null;
    }
  }

  /**
   * Ensure RAG table exists with correct dimensions
   * Note: Different providers may have different embedding dimensions
   * OpenAI text-embedding-3-small: 1536
   * Gemini text-embedding-004: 768
   * Foundry Local (nomic-embed-text): 768
   */
  private async ensureTable(): Promise<void> {
    if (this.tableInitialized) return;

    try {
      await this.dataSource.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
      await this.dataSource.query('CREATE EXTENSION IF NOT EXISTS vector');

      // Use 1536 dimensions (OpenAI default) - other providers will zero-pad
      // In production, consider dynamic dimension handling or separate tables per dimension
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS rag_documents (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          tenant_id UUID NOT NULL,
          type TEXT NOT NULL CHECK (type IN ('REQUIREMENT', 'BUG', 'TEST', 'RELEASE', 'SPRINT')),
          content TEXT NOT NULL,
          metadata JSONB DEFAULT '{}',
          embedding VECTOR(1536),
          embedding_dimensions INTEGER DEFAULT 1536,
          provider TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);

      // Create indexes - using HNSW for better performance
      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_rag_embedding_hnsw ON rag_documents USING hnsw (embedding vector_cosine_ops);
      `);
      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_rag_tenant ON rag_documents(tenant_id)
      `);
      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_rag_type ON rag_documents(type)
      `);

      this.tableInitialized = true;
      this.logger.log('RAG table initialized');
    } catch (err) {
      this.logger.error('Failed to initialize RAG table', err);
      throw err;
    }
  }

  /**
   * Normalize embedding to target dimensions (1536)
   * Zero-pads shorter embeddings or truncates longer ones
   */
  private normalizeEmbedding(embedding: number[], targetDim = 1536): number[] {
    if (embedding.length === targetDim) {
      return embedding;
    }

    if (embedding.length < targetDim) {
      // Zero-pad shorter embeddings
      return [...embedding, ...Array(targetDim - embedding.length).fill(0)];
    }

    // Truncate longer embeddings (rare case)
    return embedding.slice(0, targetDim);
  }

  /**
   * Index an item for RAG search
   */
  async indexItem(item: RagItem): Promise<void> {
    await this.ensureTable();

    // Generate embedding if not provided
    let embedding: number[] | undefined = item.embeddings;
    let originalDimensions = embedding?.length;

    if (!embedding) {
      const generated = await this.generateEmbedding(
        item.content,
        item.tenantId,
      );
      if (!generated) {
        this.logger.warn(
          `No embedding generated for ${item.id}, skipping index`,
        );
        return;
      }
      embedding = generated;
      originalDimensions = embedding.length;
    }

    // Normalize to 1536 dimensions for storage
    const normalizedEmbedding = this.normalizeEmbedding(embedding);
    const embeddingString = `[${normalizedEmbedding.join(',')}]`;

    await this.dataSource.query(
      `
      INSERT INTO rag_documents (id, tenant_id, type, content, metadata, embedding, embedding_dimensions)
      VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6::vector, $7)
      ON CONFLICT (id) DO UPDATE SET
        content = EXCLUDED.content,
        metadata = EXCLUDED.metadata,
        embedding = EXCLUDED.embedding,
        embedding_dimensions = EXCLUDED.embedding_dimensions,
        updated_at = NOW()
    `,
      [
        item.id,
        item.tenantId,
        item.type,
        item.content,
        item.metadata,
        embeddingString,
        originalDimensions,
      ],
    );

    this.logger.debug(
      `Indexed ${item.type} ${item.id} (${originalDimensions} dims)`,
    );
  }

  /**
   * Search for similar items
   */
  async search(query: string, tenantId: string, topK = 5): Promise<RagItem[]> {
    await this.ensureTable();

    const queryEmbedding = await this.generateEmbedding(query, tenantId);
    if (!queryEmbedding) {
      this.logger.error('Failed to generate query embedding');
      // Fall back to full-text search
      return this.fullTextSearch(query, tenantId, topK);
    }

    // Normalize query embedding to match stored dimensions
    const normalizedQuery = this.normalizeEmbedding(queryEmbedding);
    const embeddingString = `[${normalizedQuery.join(',')}]`;

    const results = await this.dataSource.query(
      `
      SELECT
        id,
        tenant_id as "tenantId",
        type,
        content,
        metadata,
        1 - (embedding <=> $2::vector) as similarity
      FROM rag_documents
      WHERE tenant_id = $1::uuid
        AND embedding IS NOT NULL
      ORDER BY embedding <=> $2::vector
      LIMIT $3
    `,
      [tenantId, embeddingString, topK],
    );

    return results;
  }

  /**
   * Hybrid search combining vector and full-text
   */
  async hybridSearch(
    query: string,
    tenantId: string,
    options?: { type?: string; topK?: number },
  ): Promise<RagItem[]> {
    await this.ensureTable();

    const queryEmbedding = await this.generateEmbedding(query, tenantId);
    if (!queryEmbedding) {
      // Fall back to full-text search only
      return this.fullTextSearch(query, tenantId, options?.topK || 5);
    }

    const normalizedQuery = this.normalizeEmbedding(queryEmbedding);
    const embeddingString = `[${normalizedQuery.join(',')}]`;
    const topK = options?.topK || 10;

    // Check if hybrid_search function exists
    try {
      const results = await this.dataSource.query(
        `SELECT * FROM hybrid_search($1, $2::vector, $3::uuid, $4, $5)`,
        [query, embeddingString, tenantId, options?.type || null, topK],
      );
      return results;
    } catch {
      // Fall back to vector-only search
      return this.search(query, tenantId, topK);
    }
  }

  /**
   * Full-text search fallback (when embeddings are unavailable)
   */
  private async fullTextSearch(
    query: string,
    tenantId: string,
    topK: number,
  ): Promise<RagItem[]> {
    const results = await this.dataSource.query(
      `
      SELECT
        id,
        tenant_id as "tenantId",
        type,
        content,
        metadata
      FROM rag_documents
      WHERE tenant_id = $1::uuid
        AND content ILIKE '%' || $2 || '%'
      LIMIT $3
    `,
      [tenantId, query, topK],
    );

    return results;
  }

  /**
   * Clear all RAG documents (for testing)
   */
  async clear(): Promise<void> {
    await this.dataSource.query('TRUNCATE TABLE rag_documents');
    this.logger.log('RAG documents cleared');
  }

  /**
   * Delete items by tenant
   */
  async clearTenant(tenantId: string): Promise<void> {
    await this.dataSource.query(
      'DELETE FROM rag_documents WHERE tenant_id = $1::uuid',
      [tenantId],
    );
    this.logger.log(`RAG documents cleared for tenant ${tenantId}`);
  }

  /**
   * List all items for a tenant (metadata only)
   */
  async listItems(tenantId: string): Promise<RagItem[]> {
    await this.ensureTable();
    return this.dataSource.query(
      `
      SELECT id, tenant_id as "tenantId", type, content, metadata, created_at
      FROM rag_documents
      WHERE tenant_id = $1::uuid
      ORDER BY created_at DESC
      LIMIT 100
      `,
      [tenantId],
    );
  }

  /**
   * Delete specific item
   */
  async deleteItem(id: string, tenantId: string): Promise<void> {
    await this.ensureTable();
    await this.dataSource.query(
      'DELETE FROM rag_documents WHERE id = $1::uuid AND tenant_id = $2::uuid',
      [id, tenantId],
    );
    this.logger.log(`Deleted RAG document ${id} for tenant ${tenantId}`);
  }
}
