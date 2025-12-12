/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

const mockService = {
  findAll: jest.fn(),
  create: jest.fn(),
  findOne: jest.fn(),
};

const mockReq = {
  user: {
    userId: 'u1',
    tenantId: 't1',
  },
} as any;

describe('ProjectsController', () => {
  let controller: ProjectsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectsController],
      providers: [{ provide: ProjectsService, useValue: mockService }],
    }).compile();

    controller = module.get<ProjectsController>(ProjectsController);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return projects', async () => {
      mockService.findAll.mockResolvedValue([]);
      await controller.findAll(mockReq);
      expect(mockService.findAll).toHaveBeenCalledWith('t1');
    });
  });

  describe('create', () => {
    it('should create project', async () => {
      const body = { name: 'P' } as any;
      mockService.create.mockResolvedValue({
        id: 'p1',
        name: 'P',
        tenantId: 't1',
      });
      await controller.create(body, mockReq);
      expect(mockService.create).toHaveBeenCalledWith(body, 't1');
    });
  });

  describe('findOne', () => {
    it('should find project', async () => {
      mockService.findOne.mockResolvedValue({ id: 'p1' });
      await controller.findOne('p1', mockReq);
      expect(mockService.findOne).toHaveBeenCalledWith('p1', 't1');
    });
  });
});
