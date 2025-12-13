import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BugsService } from './bugs.service';
import { Bug, BugStatus, BugSeverity, BugPriority } from './bug.entity';
import { AiProviderFactory } from '../ai/providers';
import { RagService } from '../ai/rag.service';

const mockBugRepo: {
  create: jest.Mock;
  save: jest.Mock;
  find: jest.Mock;
  findOne: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
} = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const mockAiFactory: {
  getProvider: jest.Mock;
} = {
  getProvider: jest.fn(),
};

const mockRagService: {
  indexBug: jest.Mock;
} = {
  indexBug: jest.fn().mockResolvedValue(undefined),
};

describe('BugsService', () => {
  let service: BugsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BugsService,
        {
          provide: getRepositoryToken(Bug),
          useValue: mockBugRepo,
        },
        {
          provide: AiProviderFactory,
          useValue: mockAiFactory,
        },
        {
          provide: RagService,
          useValue: mockRagService,
        },
      ],
    }).compile();

    service = module.get<BugsService>(BugsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create bug with tenantId', async () => {
      const data = {
        title: 'Login bug',
        description: 'Users cannot login',
        status: BugStatus.OPEN,
      };
      const bug = { id: 'b1', tenantId: 't1', ...data } as any;

      mockBugRepo.create.mockReturnValue(bug);
      mockBugRepo.save.mockResolvedValue(bug);

      const result = await service.create(data, 't1');

      expect(result).toEqual(bug);
      expect(mockBugRepo.create).toHaveBeenCalledWith({
        ...data,
        tenantId: 't1',
      });
      expect(mockBugRepo.save).toHaveBeenCalledWith(bug);
      // Verify async RAG indexing was triggered (fire and forget)
      expect(mockRagService.indexBug).toHaveBeenCalledWith(
        'b1',
        't1',
        'Login bug',
        'Users cannot login',
      );
    });

    it('should create bug with minimal data', async () => {
      const data = { title: 'Bug' };
      const bug = { id: 'b1', tenantId: 't1', title: 'Bug' } as any;

      mockBugRepo.create.mockReturnValue(bug);
      mockBugRepo.save.mockResolvedValue(bug);

      const result = await service.create(data, 't1');

      expect(result).toEqual(bug);
    });
  });

  describe('findAll', () => {
    it('should find all bugs for tenant', async () => {
      const bugs = [
        { id: 'b1', title: 'Bug 1', tenantId: 't1' },
        { id: 'b2', title: 'Bug 2', tenantId: 't1' },
      ];

      mockBugRepo.find.mockResolvedValue(bugs);

      const result = await service.findAll('t1');

      expect(result).toEqual(bugs);
      expect(mockBugRepo.find).toHaveBeenCalledWith({
        where: { tenantId: 't1' },
        order: { createdAt: 'DESC' },
      });
    });

    it('should return empty array when no bugs', async () => {
      mockBugRepo.find.mockResolvedValue([]);

      const result = await service.findAll('t1');

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should find bug by id and tenant', async () => {
      const bug = { id: 'b1', title: 'Bug', tenantId: 't1' };

      mockBugRepo.findOne.mockResolvedValue(bug);

      const result = await service.findOne('b1', 't1');

      expect(result).toEqual(bug);
      expect(mockBugRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'b1', tenantId: 't1' },
      });
    });

    it('should throw NotFoundException when bug not found', async () => {
      mockBugRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('b1', 't1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update bug', async () => {
      const bug = {
        id: 'b1',
        title: 'Bug',
        status: BugStatus.OPEN,
        tenantId: 't1',
      };
      const updated = { ...bug, status: BugStatus.RESOLVED };

      mockBugRepo.findOne.mockResolvedValue(updated);

      const result = await service.update(
        'b1',
        { status: BugStatus.RESOLVED },
        't1',
      );

      expect(result).toEqual(updated);
      expect(mockBugRepo.update).toHaveBeenCalledWith(
        { id: 'b1', tenantId: 't1' },
        { status: BugStatus.RESOLVED },
      );
    });

    it('should throw when updating non-existent bug', async () => {
      mockBugRepo.findOne.mockResolvedValue(null);

      await expect(
        service.update('b1', { status: BugStatus.RESOLVED }, 't1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStatus', () => {
    it('should update bug status', async () => {
      const bug = {
        id: 'b1',
        title: 'Bug',
        status: BugStatus.OPEN,
        tenantId: 't1',
      };
      const updated = { ...bug, status: BugStatus.RESOLVED };

      mockBugRepo.findOne.mockResolvedValue(updated);

      const result = await service.updateStatus('b1', BugStatus.RESOLVED, 't1');

      expect(result).toEqual(updated);
      expect(mockBugRepo.update).toHaveBeenCalledWith(
        { id: 'b1', tenantId: 't1' },
        { status: BugStatus.RESOLVED },
      );
    });
  });

  describe('delete', () => {
    it('should delete bug', async () => {
      mockBugRepo.delete.mockResolvedValue({ affected: 1 });

      await service.delete('b1', 't1');

      expect(mockBugRepo.delete).toHaveBeenCalledWith({
        id: 'b1',
        tenantId: 't1',
      });
    });

    it('should throw when deleting non-existent bug', async () => {
      mockBugRepo.delete.mockResolvedValue({ affected: 0 });

      await expect(service.delete('b1', 't1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
