import { Test, TestingModule } from '@nestjs/testing';
import { SprintsService } from './sprints.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Sprint, SprintStatus } from './sprint.entity';
import {
  SprintItem,
  SprintItemStatus,
  SprintItemType,
  SprintItemPriority,
} from './sprint-item.entity';
import { EventStorePublisher } from '../common/event-store/event-store-publisher';
import { DomainEventPublisher } from '../common/domain/domain-event.publisher';

const mockSprintRepo = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
};

const mockSprintItemRepo = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  delete: jest.fn(),
};

const mockEventStorePublisher = {
  publishAll: jest.fn().mockResolvedValue(undefined),
  publish: jest.fn().mockResolvedValue(undefined),
};

const mockDomainEventPublisher = {
  subscribe: jest.fn(),
  publish: jest.fn(),
};

describe('SprintsService', () => {
  let service: SprintsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SprintsService,
        {
          provide: getRepositoryToken(Sprint),
          useValue: mockSprintRepo,
        },
        {
          provide: getRepositoryToken(SprintItem),
          useValue: mockSprintItemRepo,
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

    service = module.get<SprintsService>(SprintsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a sprint', async () => {
      const dto = { name: 'Sprint 1', tenantId: 't1' };
      const savedSprint = { ...dto, id: 's1', status: SprintStatus.PLANNED };
      mockSprintRepo.create.mockReturnValue(savedSprint);
      mockSprintRepo.save.mockResolvedValue(savedSprint);

      const result = await service.create('Sprint 1', 't1');
      expect(result).toEqual(savedSprint);
    });
  });

  describe('updateStatus', () => {
    it('should update status and auto-set dates when ACTIVE', async () => {
      const sprint = {
        id: 's1',
        status: SprintStatus.PLANNED,
        startDate: null,
        endDate: null,
      };
      mockSprintRepo.findOne.mockResolvedValue(sprint);
      mockSprintRepo.save.mockImplementation((s) => Promise.resolve(s));

      const result = await service.updateStatus(
        's1',
        't1',
        SprintStatus.ACTIVE,
      );

      expect(result.status).toBe(SprintStatus.ACTIVE);
      expect(result.startDate).toBeDefined();
      expect(result.endDate).toBeDefined();
    });
  });

  describe('addItem', () => {
    it('should add item with correct status if sprintId provided', async () => {
      const data = { title: 'Task 1', type: SprintItemType.TASK };
      mockSprintRepo.findOne.mockResolvedValue({ id: 's1' }); // Sprint exists

      const createdItem = {
        ...data,
        status: SprintItemStatus.TODO,
        sprintId: 's1',
      };
      mockSprintItemRepo.create.mockReturnValue(createdItem);
      mockSprintItemRepo.save.mockResolvedValue(createdItem);

      const result = await service.addItem('s1', 't1', data);
      expect(result.status).toBe(SprintItemStatus.TODO);
    });

    it('should add item to backlog if no sprintId', async () => {
      const data = { title: 'Task 1' };
      const createdItem = {
        ...data,
        status: SprintItemStatus.BACKLOG,
        sprintId: undefined,
      };
      mockSprintItemRepo.create.mockReturnValue(createdItem);
      mockSprintItemRepo.save.mockResolvedValue(createdItem);

      const result = await service.addItem(null, 't1', data);
      expect(result.status).toBe(SprintItemStatus.BACKLOG);
    });
  });

  describe('planSprint', () => {
    it('should return recommended items', async () => {
      const backlogItems = [
        {
          id: '1',
          priority: SprintItemPriority.CRITICAL,
          type: SprintItemType.FEATURE,
          rqsScore: 90,
        },
        {
          id: '2',
          priority: SprintItemPriority.LOW,
          type: SprintItemType.BUG,
          rqsScore: 10,
        },
      ];
      mockSprintItemRepo.find.mockResolvedValue(backlogItems);

      const result = await service.planSprint('t1', 1); // Capacity 1

      expect(result.recommendedItems.length).toBe(1);
      expect(result.recommendedItems[0].item.id).toBe('1');
      expect(result.reasoning).toContain('AI selected');
    });

    it('should handle empty backlog', async () => {
      mockSprintItemRepo.find.mockResolvedValue([]);
      const result = await service.planSprint('t1', 10);
      expect(result.recommendedItems).toEqual([]);
    });
  });

  describe('getBurndownData', () => {
    it('should calculate burndown', async () => {
      const start = new Date();
      start.setDate(start.getDate() - 2);
      const end = new Date();
      end.setDate(end.getDate() + 2);

      const sprint = { id: 's1', startDate: start, endDate: end, velocity: 0 };
      mockSprintRepo.findOne.mockResolvedValue(sprint);

      const items = [
        { status: SprintItemStatus.DONE },
        { status: SprintItemStatus.TODO },
      ];
      mockSprintItemRepo.find.mockResolvedValue(items);

      const result = await service.getBurndownData('s1', 't1');

      expect(result.totalItems).toBe(2);
      expect(result.completedItems).toBe(1);
      expect(result.remainingItems).toBe(1);
      expect(result.dailyBurndown.length).toBeGreaterThan(0);
    });
  });
});
