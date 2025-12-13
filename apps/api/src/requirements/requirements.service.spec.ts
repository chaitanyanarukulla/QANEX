import { Test, TestingModule } from '@nestjs/testing';
import { RequirementsService } from './requirements.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Requirement, RequirementState } from './requirement.entity';
import { SprintItem } from '../sprints/sprint-item.entity';
import { RagService } from '../ai/rag.service';
import { AiProviderFactory } from '../ai/providers';
import { NotFoundException } from '@nestjs/common';
import { EventStorePublisher } from '../common/event-store/event-store-publisher';
import { DomainEventPublisher } from '../common/domain/domain-event.publisher';

const mockReqRepo: {
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

const mockSprintItemRepo: {
  create: jest.Mock;
  save: jest.Mock;
  update: jest.Mock;
} = {
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
};

const mockRagService: {
  indexRequirement: jest.Mock;
} = {
  indexRequirement: jest.fn().mockResolvedValue(null),
};

const mockAiFactory: {
  getProvider: jest.Mock;
} = {
  getProvider: jest.fn(),
};

const mockAiProvider: {
  analyzeRequirement: jest.Mock;
  chat: jest.Mock;
} = {
  analyzeRequirement: jest.fn(),
  chat: jest.fn(),
};

const mockEventStorePublisher: {
  publishAll: jest.Mock;
  publish: jest.Mock;
} = {
  publishAll: jest.fn().mockResolvedValue(undefined),
  publish: jest.fn().mockResolvedValue(undefined),
};

const mockDomainEventPublisher: {
  subscribe: jest.Mock;
  publish: jest.Mock;
} = {
  subscribe: jest.fn(),
  publish: jest.fn(),
};

describe('RequirementsService', () => {
  let service: RequirementsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RequirementsService,
        {
          provide: getRepositoryToken(Requirement),
          useValue: mockReqRepo,
        },
        {
          provide: getRepositoryToken(SprintItem),
          useValue: mockSprintItemRepo,
        },
        {
          provide: RagService,
          useValue: mockRagService,
        },
        {
          provide: AiProviderFactory,
          useValue: mockAiFactory,
        },
        {
          provide: EventStorePublisher,
          useValue: mockEventStorePublisher,
        },
        {
          provide: DomainEventPublisher,
          useValue: mockDomainEventPublisher,
        },
      ],
    }).compile();

    service = module.get<RequirementsService>(RequirementsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create requirement and index it', async () => {
      const dto = { title: 'Req 1', content: 'Content' };
      const user = {
        id: 'u1',
        tenantId: 't1',
        email: 'test@test.com',
        roles: [],
      };
      const savedReq = { ...dto, id: 'r1', tenantId: 't1' };

      mockReqRepo.create.mockReturnValue(savedReq);
      mockReqRepo.save.mockResolvedValue(savedReq);

      const result = await service.create(dto, user);

      expect(result).toEqual(savedReq);
      expect(mockRagService.indexRequirement).toHaveBeenCalledWith(
        'r1',
        't1',
        'Req 1',
        'Content',
      );
    });

    it('should create tasks if provided', async () => {
      const dto = {
        title: 'Req 1',
        content: 'Content',
        tasks: [{ title: 'Task 1', type: 'task' }],
      };
      const user = {
        id: 'u1',
        tenantId: 't1',
        email: 'test@test.com',
        roles: [],
      };
      const savedReq = { ...dto, id: 'r1', tenantId: 't1' };

      mockReqRepo.create.mockReturnValue(savedReq);
      mockReqRepo.save.mockResolvedValue(savedReq);
      mockSprintItemRepo.create.mockReturnValue({});
      mockSprintItemRepo.save.mockResolvedValue({});

      await service.create(dto, user);
      expect(mockSprintItemRepo.save).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return requirements', async () => {
      mockReqRepo.find.mockResolvedValue([]);
      const result = await service.findAll('t1');
      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return requirement', async () => {
      const req = { id: 'r1' };
      mockReqRepo.findOne.mockResolvedValue(req);
      const result = await service.findOne('r1', 't1');
      expect(result).toEqual(req);
    });

    it('should throw if not found', async () => {
      mockReqRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('r1', 't1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('analyze', () => {
    it('should analyze requirement', async () => {
      const req = { id: 'r1', content: 'content' };
      mockReqRepo.findOne.mockResolvedValue(req);
      mockAiFactory.getProvider.mockResolvedValue({ provider: mockAiProvider });
      mockAiProvider.analyzeRequirement.mockResolvedValue({
        score: 80,
        clarity: 'High',
        completeness: 'Good',
        testability: 'High',
        consistency: 'Consistent',
      });
      mockReqRepo.save.mockImplementation((r) => Promise.resolve(r));

      const result = await service.analyze('r1', 't1');
      expect(result.rqs.score).toBe(80);
    });
  });

  describe('moveTasksToBacklog', () => {
    it('should move tasks and update requirement status', async () => {
      mockReqRepo.findOne.mockResolvedValue({ id: 'r1' });
      mockSprintItemRepo.update.mockResolvedValue({ affected: 5 });
      mockReqRepo.update.mockResolvedValue({});

      const result = await service.moveTasksToBacklog('r1', 't1');
      expect(mockSprintItemRepo.update).toHaveBeenCalledWith(
        { requirementId: 'r1', tenantId: 't1' },
        expect.objectContaining({ status: 'backlog' }),
      );
      expect(mockReqRepo.update).toHaveBeenCalledWith(
        { id: 'r1', tenantId: 't1' },
        { state: RequirementState.BACKLOGGED },
      );
    });
  });
});
