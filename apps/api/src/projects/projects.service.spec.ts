import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsService } from './projects.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Project } from './project.entity';

const mockTypeOrmRepo = {
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  count: jest.fn(),
  delete: jest.fn(),
  metadata: { name: 'Project' },
};

describe('ProjectsService', () => {
  let service: ProjectsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        {
          provide: getRepositoryToken(Project),
          useValue: mockTypeOrmRepo,
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
      const projects = [{ id: 'p1', name: 'P1', tenantId: 't1' }];
      mockTypeOrmRepo.find.mockResolvedValue(projects);
      const result = await service.findAll('t1');
      expect(result).toEqual(projects);
      expect(mockTypeOrmRepo.find).toHaveBeenCalledWith({
        where: { tenantId: 't1' },
      });
    });

    it('should return empty array when no projects', async () => {
      mockTypeOrmRepo.find.mockResolvedValue([]);
      const result = await service.findAll('t1');
      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('should create project', async () => {
      const project = { name: 'P1', tenantId: 't1' } as Partial<Project>;
      const createdProject = {
        id: 'p1',
        name: 'P1',
        tenantId: 't1',
      } as Project;
      mockTypeOrmRepo.create.mockReturnValue(createdProject);
      mockTypeOrmRepo.save.mockResolvedValue(createdProject);

      const result = await service.create(project, 't1');

      expect(result).toEqual(createdProject);
      expect(mockTypeOrmRepo.create).toHaveBeenCalledWith({
        name: 'P1',
        tenantId: 't1',
      });
      expect(mockTypeOrmRepo.save).toHaveBeenCalledWith(createdProject);
    });
  });

  describe('count', () => {
    it('should return count of projects for tenant', async () => {
      mockTypeOrmRepo.count.mockResolvedValue(5);
      const result = await service.count('t1');
      expect(result).toBe(5);
      expect(mockTypeOrmRepo.count).toHaveBeenCalledWith({
        where: { tenantId: 't1' },
      });
    });
  });

  describe('findOne', () => {
    it('should return project by id and tenant', async () => {
      const project = { id: 'p1', name: 'P1', tenantId: 't1' };
      mockTypeOrmRepo.findOne.mockResolvedValue(project);
      const result = await service.findOne('p1', 't1');
      expect(result).toEqual(project);
      expect(mockTypeOrmRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'p1', tenantId: 't1' },
      });
    });

    it('should return null when project not found', async () => {
      mockTypeOrmRepo.findOne.mockResolvedValue(null);
      const result = await service.findOne('p1', 't1');
      expect(result).toBeNull();
    });
  });
});
