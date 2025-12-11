import { Injectable, Inject } from '@nestjs/common';
import { PiiRedactionService } from './pii-redaction.service';

export interface RagItem {
  id: string;
  tenantId: string;
  type: 'REQUIREMENT' | 'BUG' | 'TEST' | 'RELEASE';
  content: string;
  metadata: Record<string, any>;
  embeddings?: number[];
}

export interface RagBackend {
  indexItem(item: RagItem): Promise<void>;
  search(query: string, tenantId: string, topK?: number): Promise<RagItem[]>;
  clear?(): Promise<void>;
  listItems?(tenantId: string): Promise<RagItem[]>;
  deleteItem?(id: string, tenantId: string): Promise<void>;
}

export const RAG_BACKEND_TOKEN = 'RAG_BACKEND_TOKEN';

@Injectable()
export class InMemoryRagAdapter implements RagBackend {
  private inMemoryStore: RagItem[] = [];

  async indexItem(item: RagItem): Promise<void> {
    this.inMemoryStore = this.inMemoryStore.filter((i) => i.id !== item.id);
    this.inMemoryStore.push(item);
    console.log(
      `[InMemoryRAG] Indexed ${item.type} ${item.id} (Tenant: ${item.tenantId})`,
    );
    return Promise.resolve();
  }

  async search(
    query: string,
    tenantId: string,
    topK: number = 5,
  ): Promise<RagItem[]> {
    const lowerQuery = query.toLowerCase();
    // Simple keyword search mock
    const results = this.inMemoryStore.filter((item) => {
      if (item.tenantId !== tenantId) return false;
      const title = (item.metadata.title as string) || '';
      return (
        item.content.toLowerCase().includes(lowerQuery) ||
        title.toLowerCase().includes(lowerQuery)
      );
    });
    return Promise.resolve(results.slice(0, topK));
  }

  async listItems(tenantId: string): Promise<RagItem[]> {
    return Promise.resolve(
      this.inMemoryStore.filter((i) => i.tenantId === tenantId),
    );
  }

  async deleteItem(id: string, tenantId: string): Promise<void> {
    this.inMemoryStore = this.inMemoryStore.filter(
      (i) => !(i.id === id && i.tenantId === tenantId),
    );
    return Promise.resolve();
  }

  async clear(): Promise<void> {
    this.inMemoryStore = [];
    return Promise.resolve();
  }
}

@Injectable()
export class RagService {
  constructor(
    @Inject(RAG_BACKEND_TOKEN) private readonly backend: RagBackend,
    private readonly piiService: PiiRedactionService,
  ) {}

  async indexItem(item: RagItem): Promise<void> {
    // Redact content before indexing
    const redactedContent = this.piiService.redact(item.content);

    // Chunking Logic
    const chunks = this.chunkText(redactedContent, 1000, 200); // 1000 chars, 200 overlap

    // If small enough, index as is
    if (chunks.length <= 1) {
      item.content = redactedContent;
      return this.backend.indexItem(item);
    }

    // Index individual chunks
    for (let i = 0; i < chunks.length; i++) {
      const chunkItem: RagItem = {
        ...item,
        id: `${item.id}-chunk-${i}`,
        content: chunks[i],
        metadata: {
          ...item.metadata,
          isChunk: true,
          chunkIndex: i,
          totalChunks: chunks.length,
          originalId: item.id,
        },
      };
      await this.backend.indexItem(chunkItem);
    }
  }

  private chunkText(
    text: string,
    chunkSize: number,
    overlap: number,
  ): string[] {
    if (!text) return [];
    if (text.length <= chunkSize) return [text];

    const chunks: string[] = [];
    let start = 0;
    while (start < text.length) {
      let end = start + chunkSize;
      // Try to break at a newline or space if possible
      if (end < text.length) {
        const lastSpace = text.lastIndexOf(' ', end);
        if (lastSpace > start) {
          end = lastSpace;
        }
      }
      chunks.push(text.slice(start, end));
      start = end - overlap;
    }
    return chunks;
  }

  async indexRequirement(
    id: string,
    tenantId: string,
    title: string,
    content: string,
  ) {
    return this.indexItem({
      id,
      tenantId,
      type: 'REQUIREMENT',
      content: `${title}\n${content}`,
      metadata: { title },
    });
  }

  async indexBug(
    id: string,
    tenantId: string,
    title: string,
    description: string,
  ) {
    return this.indexItem({
      id,
      tenantId,
      type: 'BUG',
      content: `${title}\n${description}`,
      metadata: { title },
    });
  }

  async search(
    query: string,
    tenantId: string,
    topK?: number,
  ): Promise<RagItem[]> {
    return this.backend.search(query, tenantId, topK);
  }

  // Internal retrieval helper for efficient contextual lookups
  async retrieveContext(
    query: string,
    tenantId: string,
    type?: string,
  ): Promise<string> {
    const items = await this.search(query, tenantId, 5); // Get top 5 chunks
    const filtered = type ? items.filter((i) => i.type === type) : items;

    if (filtered.length === 0) return '';

    return filtered
      .map((i) => {
        const title = (i.metadata?.title as string) || 'Unknown';
        const chunkInfo = i.metadata?.isChunk
          ? ` (Chunk ${i.metadata.chunkIndex + 1}/${i.metadata.totalChunks})`
          : '';
        return `[${i.type}] ${title}${chunkInfo}:\n${i.content.trim()}`;
      })
      .join('\n\n');
  }

  async clear(): Promise<void> {
    if (this.backend.clear) {
      await this.backend.clear();
    }
  }

  async list(tenantId: string): Promise<RagItem[]> {
    if (this.backend.listItems) {
      return this.backend.listItems(tenantId);
    }
    return [];
  }

  async delete(id: string, tenantId: string): Promise<void> {
    if (this.backend.deleteItem) {
      await this.backend.deleteItem(id, tenantId);
    }
  }
}
