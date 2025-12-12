/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { FileUploadService } from './file-upload.service';
import { ConfluenceService } from './confluence.service';
import { DocumentsAiService } from './documents-ai.service';
import { DocumentSource } from './entities/document.entity';

const mockDocumentsService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  createVersion: jest.fn(),
};

const mockDocumentsAiService = {
  analyzeDocument: jest.fn(),
};

const mockFileUploadService = {
  extractText: jest.fn(),
};

const mockConfluenceService = {
  getPage: jest.fn(),
};

const mockReq = {
  user: {
    userId: 'u1',
    tenantId: 't1',
  },
} as any;

describe('DocumentsController', () => {
  let controller: DocumentsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocumentsController],
      providers: [
        { provide: DocumentsService, useValue: mockDocumentsService },
        { provide: DocumentsAiService, useValue: mockDocumentsAiService },
        { provide: FileUploadService, useValue: mockFileUploadService },
        { provide: ConfluenceService, useValue: mockConfluenceService },
      ],
    }).compile();

    controller = module.get<DocumentsController>(DocumentsController);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create document', async () => {
      const dto = { title: 'Doc', content: 'Content' };
      mockDocumentsService.create.mockResolvedValue({ id: 'd1', ...dto });

      const result = await controller.create(dto, mockReq);
      expect(result).toHaveProperty('id', 'd1');
      expect(mockDocumentsService.create).toHaveBeenCalledWith(dto, 't1', 'u1');
    });
  });

  describe('findAll', () => {
    it('should return documents', async () => {
      mockDocumentsService.findAll.mockResolvedValue([]);
      const result = await controller.findAll(mockReq);
      expect(result).toEqual([]);
      expect(mockDocumentsService.findAll).toHaveBeenCalledWith('t1');
    });
  });

  describe('findOne', () => {
    it('should return document', async () => {
      mockDocumentsService.findOne.mockResolvedValue({ id: 'd1' });
      const result = await controller.findOne('d1', mockReq);
      expect(result).toHaveProperty('id', 'd1');
    });
  });

  describe('update', () => {
    it('should update document', async () => {
      mockDocumentsService.update.mockResolvedValue({
        id: 'd1',
        title: 'Updated',
      });
      const result = await controller.update(
        'd1',
        { title: 'Updated' },
        mockReq,
      );
      expect(result.title).toBe('Updated');
    });
  });

  describe('remove', () => {
    it('should remove document', async () => {
      mockDocumentsService.remove.mockResolvedValue(true);
      await controller.remove('d1', mockReq);
      expect(mockDocumentsService.remove).toHaveBeenCalledWith('d1', 't1');
    });
  });

  describe('analyze', () => {
    it('should analyze document', async () => {
      mockDocumentsService.findOne.mockResolvedValue({
        id: 'd1',
        title: 'Doc',
      });
      mockDocumentsAiService.analyzeDocument.mockResolvedValue({
        summary: 'Sum',
      });

      const result = await controller.analyze('d1', mockReq);
      expect(result.summary).toBe('Sum');
      expect(mockDocumentsAiService.analyzeDocument).toHaveBeenCalled();
    });
  });

  describe('uploadFile', () => {
    it('should upload and create document', async () => {
      const file = { originalname: 'test.pdf' } as any;
      mockFileUploadService.extractText.mockResolvedValue('Extracted');
      mockDocumentsService.create.mockResolvedValue({ id: 'd1' });

      await controller.uploadFile(file, mockReq);

      expect(mockFileUploadService.extractText).toHaveBeenCalledWith(file);
      expect(mockDocumentsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'test.pdf',
          content: 'Extracted',
          source: DocumentSource.UPLOAD,
        }),
        't1',
        'u1',
      );
    });
  });

  describe('importConfluence', () => {
    it('should import from confluence', async () => {
      const dto = { siteUrl: 'url', email: 'e', apiToken: 't', pageId: 'p' };
      mockConfluenceService.getPage.mockResolvedValue({
        title: 'Conf',
        content: 'C',
      });
      mockDocumentsService.create.mockResolvedValue({ id: 'd1' });

      await controller.importConfluence(dto, mockReq);

      expect(mockConfluenceService.getPage).toHaveBeenCalledWith(
        'url',
        'e',
        't',
        'p',
      );
      expect(mockDocumentsService.create).toHaveBeenCalledWith(
        expect.objectContaining({ source: DocumentSource.CONFLUENCE }),
        't1',
        'u1',
      );
    });
  });
});
