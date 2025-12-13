import { Test, TestingModule } from '@nestjs/testing';
import { SprintsController } from './sprints.controller';
import { SprintsService } from './sprints.service';
import { SprintStatus } from './sprint.entity';

const mockService: {
  create: jest.Mock;
  findAll: jest.Mock;
  findOne: jest.Mock;
  update: jest.Mock;
  updateStatus: jest.Mock;
  addItem: jest.Mock;
  getBacklogItems: jest.Mock;
  getStructuredBacklog: jest.Mock;
  getSprintItems: jest.Mock;
  planSprint: jest.Mock;
} = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  updateStatus: jest.fn(),
  addItem: jest.fn(),
  getBacklogItems: jest.fn(),
  getStructuredBacklog: jest.fn(),
  getSprintItems: jest.fn(),
  planSprint: jest.fn(),
};

const mockReq = {
  user: {
    userId: 'u1',
    tenantId: 't1',
  },
} as any;

describe('SprintsController', () => {
  let controller: SprintsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SprintsController],
      providers: [{ provide: SprintsService, useValue: mockService }],
    }).compile();

    controller = module.get<SprintsController>(SprintsController);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create sprint', async () => {
      const dto = { name: 'S1' };
      mockService.create.mockResolvedValue(dto);
      await controller.create(dto, mockReq);
      expect(mockService.create).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all sprints', async () => {
      mockService.findAll.mockResolvedValue([]);
      await controller.findAll(mockReq);
      expect(mockService.findAll).toHaveBeenCalledWith('t1');
    });
  });

  describe('planSprint', () => {
    it('should plan sprint', async () => {
      mockService.planSprint.mockResolvedValue({});
      await controller.planSprint({ capacity: 50 }, mockReq);
      expect(mockService.planSprint).toHaveBeenCalledWith('t1', 50);
    });
  });

  describe('updateStatus', () => {
    it('should update status', async () => {
      mockService.updateStatus.mockResolvedValue({});
      await controller.updateStatus(
        's1',
        { status: SprintStatus.ACTIVE },
        mockReq,
      );
      expect(mockService.updateStatus).toHaveBeenCalledWith(
        's1',
        't1',
        SprintStatus.ACTIVE,
      );
    });
  });
});
