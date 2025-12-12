/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { ReleasesService } from './releases.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Release, ReleaseStatus } from './release.entity';
import { EventStorePublisher } from '../common/event-store/event-store-publisher';
import { DomainEventPublisher } from '../common/domain/domain-event.publisher';

const mockRepo = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
};

const mockEventStorePublisher = {
  publishAll: jest.fn().mockResolvedValue(undefined),
  publish: jest.fn().mockResolvedValue(undefined),
};

const mockDomainEventPublisher = {
  subscribe: jest.fn(),
  publish: jest.fn(),
};

describe('ReleasesService', () => {
  let service: ReleasesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReleasesService,
        {
          provide: getRepositoryToken(Release),
          useValue: mockRepo,
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

    service = module.get<ReleasesService>(ReleasesService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create release', async () => {
      const r = {
        version: '1.0.0',
        tenantId: 't1',
        env: 'staging',
        status: ReleaseStatus.PLANNED,
      };
      mockRepo.create.mockReturnValue(r);
      mockRepo.save.mockResolvedValue(r);

      const result = await service.create('1.0.0', 't1');
      expect(result).toEqual(r);
    });
  });

  describe('findAll', () => {
    it('should return releases', async () => {
      mockRepo.find.mockResolvedValue([]);
      const result = await service.findAll('t1');
      expect(result).toEqual([]);
    });
  });

  describe('update', () => {
    it('should update and return release', async () => {
      const r = { id: 'r1' };
      mockRepo.findOne.mockResolvedValue(r);
      mockRepo.update.mockResolvedValue({});

      const result = await service.update('r1', {}, 't1');
      expect(result).toEqual(r);
    });
  });

  describe('helpers', () => {
    it('should updateScore', async () => {
      mockRepo.update.mockResolvedValue({});
      await service.updateScore('r1', 100, {} as any);
      expect(mockRepo.update).toHaveBeenCalled();
    });

    it('should updateExplanation', async () => {
      mockRepo.update.mockResolvedValue({});
      await service.updateExplanation('r1', {
        summary: '',
        risks: [],
        strengths: [],
      });
      expect(mockRepo.update).toHaveBeenCalled();
    });
  });
});
