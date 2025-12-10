import { Injectable, Inject, Optional } from '@nestjs/common';
import { PiiRedactionService } from './pii-redaction.service';

export interface RagItem {
  id: string;
  tenantId: string;
  type: 'REQUIREMENT' | 'BUG' | 'TEST' | 'RELEASE';
  content: string;
  metadata: any;
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
      return (
        item.content.toLowerCase().includes(lowerQuery) ||
        item.metadata?.title?.toLowerCase().includes(lowerQuery)
      );
    });
    return results.slice(0, topK);
  }

  async listItems(tenantId: string): Promise<RagItem[]> {
    return this.inMemoryStore.filter((i) => i.tenantId === tenantId);
  }

  async deleteItem(id: string, tenantId: string): Promise<void> {
    this.inMemoryStore = this.inMemoryStore.filter(
      (i) => !(i.id === id && i.tenantId === tenantId),
    );
  }

  async clear(): Promise<void> {
    this.inMemoryStore = [];
  }
}

@Injectable()
export class RagService {
  constructor(
    @Inject(RAG_BACKEND_TOKEN) private readonly backend: RagBackend,
    private readonly piiService: PiiRedactionService,
  ) { }

  async indexItem(item: RagItem): Promise<void> {
    // Redact content before indexing
    item.content = this.piiService.redact(item.content);
    return this.backend.indexItem(item);
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

  async search(query: string, tenantId: string, topK?: number): Promise<RagItem[]> {
    return this.backend.search(query, tenantId, topK);
  }

  // Internal retrieval helper for efficient contextual lookups
  async retrieveContext(
    query: string,
    tenantId: string,
    type?: string,
  ): Promise<string> {
    const items = await this.search(query, tenantId);
    const filtered = type ? items.filter((i) => i.type === type) : items;
    return filtered
      .map(
        (i) =>
          `[${i.type}] ${i.metadata.title}: ${i.content.substring(0, 200)}...`,
      )
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
