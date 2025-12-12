import { Test, TestingModule } from '@nestjs/testing';
import { DocumentsService } from './documents.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Document, DocumentStatus } from './entities/document.entity';
import { DocumentVersion } from './entities/document-version.entity';
import { DocumentsAiService } from './documents-ai.service';
import { RagService } from '../ai/rag.service';
import { NotFoundException } from '@nestjs/common';

const mockDocumentRepo = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  createQueryBuilder: jest.fn(() => ({
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    loadRelationCountAndMap: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
  })),
  delete: jest.fn(),
};

const mockVersionRepo = {
  create: jest.fn(),
  save: jest.fn(),
  count: jest.fn(),
};

const mockAiService = {
  analyzeDocument: jest.fn().mockResolvedValue({}),
};

const mockRagService = {
  indexItem: jest.fn().mockResolvedValue({}),
};

describe('DocumentsService', () => {
  let service: DocumentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        {
          provide: getRepositoryToken(Document),
          useValue: mockDocumentRepo,
        },
        {
          provide: getRepositoryToken(DocumentVersion),
          useValue: mockVersionRepo,
        },
        {
          provide: DocumentsAiService,
          useValue: mockAiService,
        },
        {
          provide: RagService,
          useValue: mockRagService,
        },
      ],
    }).compile();

    service = module.get<DocumentsService>(DocumentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create and save a document', async () => {
      const dto = { title: 'Test', content: 'Content' };
      const tenantId = 'tenant-1';
      const savedDoc = {
        ...dto,
        id: 'doc-1',
        status: DocumentStatus.DRAFT,
        tenantId,
      };

      mockDocumentRepo.create.mockReturnValue(savedDoc);
      mockDocumentRepo.save.mockResolvedValue(savedDoc);

      const result = await service.create(dto, tenantId);
      expect(result).toEqual(savedDoc);
      expect(mockDocumentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId, status: DocumentStatus.DRAFT }),
      );
    });
  });

  describe('findAll', () => {
    it('should return array of documents', async () => {
      const result = await service.findAll('tenant-1');
      expect(result).toEqual([]);
      expect(mockDocumentRepo.createQueryBuilder).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a document', async () => {
      const doc = { id: 'doc-1', tenantId: 'tenant-1' };
      mockDocumentRepo.findOne.mockResolvedValue(doc);
      const result = await service.findOne('doc-1', 'tenant-1');
      expect(result).toEqual(doc);
    });

    it('should throw NotFoundException if not found', async () => {
      mockDocumentRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('doc-1', 'tenant-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update and return document', async () => {
      const doc = {
        id: 'doc-1',
        tenantId: 'tenant-1',
        status: DocumentStatus.DRAFT,
      };
      mockDocumentRepo.findOne.mockResolvedValue(doc);
      mockDocumentRepo.save.mockResolvedValue({ ...doc, title: 'New Title' });

      const result = await service.update(
        'doc-1',
        { title: 'New Title' },
        'tenant-1',
      );
      expect(result.title).toBe('New Title');
    });

    it('should trigger AI analysis when status changes to READY_FOR_IMPLEMENTATION', async () => {
      const doc = {
        id: 'doc-1',
        tenantId: 'tenant-1',
        status: DocumentStatus.DRAFT,
        content: 'content',
      };
      mockDocumentRepo.findOne.mockResolvedValue(doc);
      mockDocumentRepo.save.mockImplementation((d) => Promise.resolve(d));

      await service.update(
        'doc-1',
        { status: DocumentStatus.READY_FOR_IMPLEMENTATION },
        'tenant-1',
      );

      expect(mockAiService.analyzeDocument).toHaveBeenCalled();
      expect(mockRagService.indexItem).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete document', async () => {
      mockDocumentRepo.delete.mockResolvedValue({ affected: 1 });
      await service.remove('doc-1', 'tenant-1');
      expect(mockDocumentRepo.delete).toHaveBeenCalledWith({
        id: 'doc-1',
        tenantId: 'tenant-1',
      });
    });

    it('should throw Error if not found', async () => {
      mockDocumentRepo.delete.mockResolvedValue({ affected: 0 });
      await expect(service.remove('doc-1', 'tenant-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
