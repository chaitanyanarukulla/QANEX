import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsService } from './projects.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Project } from './project.entity';

const mockRepo = {
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  count: jest.fn(),
};

describe('ProjectsService', () => {
  let service: ProjectsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        {
          provide: getRepositoryToken(Project),
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return projects', async () => {
      mockRepo.find.mockResolvedValue([]);
      const result = await service.findAll('t1');
      expect(result).toEqual([]);
      expect(mockRepo.find).toHaveBeenCalledWith({ where: { tenantId: 't1' } });
    });
  });

  describe('create', () => {
    it('should create project', async () => {
      const p = { name: 'P1', tenantId: 't1' };
      mockRepo.save.mockResolvedValue(p);
      const result = await service.create(p);
      expect(result).toEqual(p);
    });
  });

  describe('count', () => {
    it('should return count', async () => {
      mockRepo.count.mockResolvedValue(5);
      const result = await service.count('t1');
      expect(result).toBe(5);
    });
  });

  describe('findOne', () => {
    it('should return project', async () => {
      const p = { id: 'p1' };
      mockRepo.findOne.mockResolvedValue(p);
      const result = await service.findOne('p1', 't1');
      expect(result).toEqual(p);
    });
  });
});
