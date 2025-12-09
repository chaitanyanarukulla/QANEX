import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { LocalModelGateway } from './local-model.gateway';
import { RagBackend, RagItem } from './rag.service';

/**
 * PgVector RAG Adapter
 * Supports both Azure OpenAI and local Ollama for embeddings
 * Uses PostgreSQL with pgvector extension for vector storage
 */
@Injectable()
export class PgVectorRagAdapter implements RagBackend {
  private readonly logger = new Logger(PgVectorRagAdapter.name);
  private tableInitialized = false;
  private readonly aiProvider: string;

  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    @Optional() private readonly localModelGateway: LocalModelGateway,
  ) {
    this.aiProvider = this.configService.get('AI_PROVIDER', 'mock');
  }

  /**
   * Generate embeddings using appropriate provider
   */
  private async generateEmbedding(text: string): Promise<number[] | null> {
    try {
      if (this.aiProvider === 'azure') {
        return await this.generateAzureEmbedding(text);
      } else if (this.aiProvider === 'local' && this.localModelGateway) {
        const embeddings = await this.localModelGateway.embed({
          model: this.configService.get('LOCAL_EMBEDDING_MODEL', 'nomic-embed-text'),
          inputs: [text],
        });
        return embeddings?.[0] || null;
      } else {
        // Mock provider - generate random embeddings for development
        this.logger.debug('Using mock embeddings (AI_PROVIDER=mock)');
        return this.generateMockEmbedding();
      }
    } catch (err) {
      this.logger.error('Failed to generate embedding', err);
      return null;
    }
  }

  /**
   * Generate embeddings using Azure OpenAI
   */
  private async generateAzureEmbedding(text: string): Promise<number[]> {
    const endpoint = this.configService.get('AZURE_OPENAI_ENDPOINT');
    const apiKey = this.configService.get('AZURE_OPENAI_API_KEY');
    const apiVersion = this.configService.get('AZURE_OPENAI_API_VERSION', '2024-02-15-preview');
    const deployment = this.configService.get('AZURE_OPENAI_DEPLOYMENT_EMBEDDING', 'text-embedding-ada-002');

    if (!endpoint || !apiKey) {
      throw new Error('Azure OpenAI not configured for embeddings');
    }

    const url = `${endpoint}openai/deployments/${deployment}/embeddings?api-version=${apiVersion}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ input: text }),
    });

    if (!response.ok) {
      throw new Error(`Azure OpenAI embedding failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data?.data?.[0]?.embedding || [];
  }

  /**
   * Generate mock embeddings for development
   */
  private generateMockEmbedding(): number[] {
    // Generate deterministic-ish embeddings based on text length
    // This allows basic testing without an AI provider
    return Array.from({ length: 1536 }, (_, i) => Math.sin(i * 0.1) * 0.5);
  }

  /**
   * Ensure RAG table exists
   */
  private async ensureTable(): Promise<void> {
    if (this.tableInitialized) return;

    try {
      await this.dataSource.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
      await this.dataSource.query('CREATE EXTENSION IF NOT EXISTS vector');
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS rag_documents (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          tenant_id UUID NOT NULL,
          type TEXT NOT NULL CHECK (type IN ('REQUIREMENT', 'BUG', 'TEST', 'RELEASE', 'SPRINT')),
          content TEXT NOT NULL,
          metadata JSONB DEFAULT '{}',
          embedding VECTOR(1536),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);

      // Create indexes
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
   * Index an item for RAG search
   */
  async indexItem(item: RagItem): Promise<void> {
    await this.ensureTable();

    // Generate embedding if not provided
    let embedding = item.embeddings;
    if (!embedding) {
      embedding = await this.generateEmbedding(item.content);
      if (!embedding) {
        this.logger.warn(`No embedding generated for ${item.id}, skipping index`);
        return;
      }
    }

    const embeddingString = `[${embedding.join(',')}]`;

    await this.dataSource.query(
      `
      INSERT INTO rag_documents (id, tenant_id, type, content, metadata, embedding)
      VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6::vector)
      ON CONFLICT (id) DO UPDATE SET
        content = EXCLUDED.content,
        metadata = EXCLUDED.metadata,
        embedding = EXCLUDED.embedding,
        updated_at = NOW()
    `,
      [item.id, item.tenantId, item.type, item.content, item.metadata, embeddingString],
    );

    this.logger.debug(`Indexed ${item.type} ${item.id}`);
  }

  /**
   * Search for similar items
   */
  async search(query: string, tenantId: string, topK = 5): Promise<RagItem[]> {
    await this.ensureTable();

    const queryEmbedding = await this.generateEmbedding(query);
    if (!queryEmbedding) {
      this.logger.error('Failed to generate query embedding');
      return [];
    }

    const embeddingString = `[${queryEmbedding.join(',')}]`;

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

    const queryEmbedding = await this.generateEmbedding(query);
    if (!queryEmbedding) {
      // Fall back to full-text search only
      return this.fullTextSearch(query, tenantId, options?.topK || 5);
    }

    const embeddingString = `[${queryEmbedding.join(',')}]`;
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
   * Full-text search fallback
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
    await this.dataSource.query('DELETE FROM rag_documents WHERE tenant_id = $1::uuid', [
      tenantId,
    ]);
    this.logger.log(`RAG documents cleared for tenant ${tenantId}`);
  }
}
