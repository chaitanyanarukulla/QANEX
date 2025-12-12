/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { RequirementsController } from './requirements.controller';
import { RequirementsService } from './requirements.service';
import { RequirementState } from './requirement.entity';

const mockService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  analyze: jest.fn(),
  assignToSprint: jest.fn(),
  generateTasks: jest.fn(),
  moveTasksToBacklog: jest.fn(),
};

const mockReq = {
  user: {
    userId: 'u1',
    tenantId: 't1',
  },
} as any;

describe('RequirementsController', () => {
  let controller: RequirementsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RequirementsController],
      providers: [{ provide: RequirementsService, useValue: mockService }],
    }).compile();

    controller = module.get<RequirementsController>(RequirementsController);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create requirement', async () => {
      const dto = { title: 'Req 1', content: 'C' };
      mockService.create.mockResolvedValue(dto);
      const result = await controller.create(dto, mockReq);
      expect(result).toEqual(dto);
      expect(mockService.create).toHaveBeenCalledWith(dto, mockReq.user);
    });
  });

  describe('findAll', () => {
    it('should return all requirements', async () => {
      mockService.findAll.mockResolvedValue([]);
      expect(await controller.findAll(mockReq)).toEqual([]);
      expect(mockService.findAll).toHaveBeenCalledWith('t1');
    });
  });

  describe('findOne', () => {
    it('should return one requirement', async () => {
      mockService.findOne.mockResolvedValue({ id: 'r1' });
      expect(await controller.findOne('r1', mockReq)).toEqual({ id: 'r1' });
    });
  });

  describe('update', () => {
    it('should update requirement', async () => {
      mockService.update.mockResolvedValue({ id: 'r1', state: 'DRAFT' });
      await controller.update('r1', { state: RequirementState.DRAFT }, mockReq);
      expect(mockService.update).toHaveBeenCalled();
    });
  });

  describe('approve', () => {
    it('should approve requirement', async () => {
      mockService.update.mockResolvedValue({ id: 'r1', state: 'APPROVED' });
      await controller.approve('r1', mockReq);
      expect(mockService.update).toHaveBeenCalledWith(
        'r1',
        { state: RequirementState.APPROVED },
        mockReq.user,
      );
    });
  });

  describe('generateTasks', () => {
    it('should generate tasks', async () => {
      mockService.generateTasks.mockResolvedValue([{}]);
      const res = await controller.generateTasks('r1', mockReq);
      expect(res.count).toBe(1);
    });
  });

  describe('moveTasksToBacklog', () => {
    it('should move tasks', async () => {
      mockService.moveTasksToBacklog.mockResolvedValue({});
      await controller.moveTasksToBacklog('r1', mockReq);
      expect(mockService.moveTasksToBacklog).toHaveBeenCalledWith('r1', 't1');
    });
  });
});
