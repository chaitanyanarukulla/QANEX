import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Document,
  DocumentSource,
  DocumentStatus,
} from './entities/document.entity';
import { DocumentVersion } from './entities/document-version.entity';

import { DocumentsAiService } from './documents-ai.service';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(Document)
    private documentRepo: Repository<Document>,
    @InjectRepository(DocumentVersion)
    private versionRepo: Repository<DocumentVersion>,
    private documentsAiService: DocumentsAiService,
  ) {}

  async create(
    data: {
      title: string;
      content: string;
      source?: DocumentSource;
      sourceUrl?: string;
    },
    tenantId: string,
    authorId?: string,
  ): Promise<Document> {
    const document = this.documentRepo.create({
      ...data,
      tenantId,
      authorId,
      status: DocumentStatus.DRAFT,
    });
    return this.documentRepo.save(document);
  }

  async findAll(tenantId: string): Promise<Document[]> {
    return this.documentRepo.find({
      where: { tenantId },
      order: { updatedAt: 'DESC' },
      relations: ['aiReview'],
    });
  }

  async findOne(id: string, tenantId: string): Promise<Document> {
    const document = await this.documentRepo.findOne({
      where: { id, tenantId },
      relations: ['versions', 'aiReview'],
    });

    if (!document) {
      throw new NotFoundException(`Document ${id} not found`);
    }

    return document;
  }

  async update(
    id: string,
    data: Partial<Document>,
    tenantId: string,
  ): Promise<Document> {
    const document = await this.findOne(id, tenantId);

    // Auto-versioning logic could go here if status changes to FINAL or content changes on FINAL doc
    // For now, simple update
    Object.assign(document, data);
    return this.documentRepo.save(document);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const result = await this.documentRepo.delete({ id, tenantId });
    if (result.affected === 0) {
      throw new NotFoundException(`Document ${id} not found`);
    }
  }

  // Versioning
  async createVersion(
    documentId: string,
    tenantId: string,
  ): Promise<DocumentVersion> {
    const document = await this.findOne(documentId, tenantId);

    const count = await this.versionRepo.count({ where: { documentId } });

    const version = this.versionRepo.create({
      documentId,
      versionNumber: count + 1,
      content: document.content,
      authorId: document.authorId, // Or current user
    });

    return this.versionRepo.save(version);
  }

  async analyze(id: string, tenantId: string) {
    const document = await this.findOne(id, tenantId);
    return this.documentsAiService.analyzeDocument(document, tenantId);
  }
}
