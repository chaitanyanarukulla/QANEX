import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Document,
  DocumentSource,
  DocumentStatus,
} from './entities/document.entity';
import { DocumentVersion } from './entities/document-version.entity';

import { DocumentsAiService } from './documents-ai.service';

import { RagService } from '../ai/rag.service';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    @InjectRepository(Document)
    private documentRepo: Repository<Document>,
    @InjectRepository(DocumentVersion)
    private versionRepo: Repository<DocumentVersion>,
    private documentsAiService: DocumentsAiService,
    private ragService: RagService,
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
    return this.documentRepo
      .createQueryBuilder('document')
      .leftJoinAndSelect('document.aiReview', 'aiReview')
      .loadRelationCountAndMap(
        'document.requirementsCount',
        'document.requirements',
      )
      .where('document.tenantId = :tenantId', { tenantId })
      .orderBy('document.updatedAt', 'DESC')
      .getMany();
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
    const oldStatus = document.status;
    if (data.status && data.status !== document.status) {
      this.logger.log(
        `[Document] Status Change: ${document.status} -> ${data.status}`,
        {
          context: 'DocumentsService',
          tenantId,
          documentId: id,
          oldStatus: document.status,
          newStatus: data.status,
        },
      );
    }

    Object.assign(document, data);
    const savedDoc = await this.documentRepo.save(document);

    // Workflow Triggers
    if (data.status && data.status !== oldStatus) {
      // AI_ANALYZING status change no longer auto-triggers analysis
      // User must explicitly click "Run AI Analysis" button

      if (data.status === DocumentStatus.READY_FOR_IMPLEMENTATION) {
        // Trigger AI Requirements Generation (Epics -> Reqs -> Tasks)
        this.documentsAiService
          .analyzeDocument(savedDoc, tenantId, 'REQUIREMENTS')
          .catch((err) =>
            console.error(
              `Background AI Requirements Generation failed for ${savedDoc.id}`,
              err,
            ),
          );

        // Index to Knowledge Base (Source of Truth)
        this.ragService
          .indexItem({
            id: savedDoc.id,
            tenantId,
            type: 'REQUIREMENT',
            content: savedDoc.content,
            metadata: {
              title: savedDoc.title,
              source: 'KNOWLEDGE_BASE',
              status: 'APPROVED',
            },
          })
          .catch((err) =>
            console.error(
              `Background RAG Indexing failed for ${savedDoc.id}`,
              err,
            ),
          );
      } else if (data.status === DocumentStatus.FINAL) {
        // Final state, maybe archived or just locked
        // RAG indexing already done at READY_FOR_IMPLEMENTATION
      }
    }

    return savedDoc;
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
