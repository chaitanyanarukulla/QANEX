/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';

const mockService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
};

describe('TenantsController', () => {
  let controller: TenantsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TenantsController],
      providers: [{ provide: TenantsService, useValue: mockService }],
    }).compile();

    controller = module.get<TenantsController>(TenantsController);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create tenant', async () => {
      mockService.create.mockResolvedValue({});
      await controller.create({ name: 'T', slug: 't' });
      expect(mockService.create).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should list tenants', async () => {
      mockService.findAll.mockResolvedValue([]);
      await controller.findAll();
      expect(mockService.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should find one', async () => {
      mockService.findOne.mockResolvedValue({ id: 't1' });
      await controller.findOne('t1');
      expect(mockService.findOne).toHaveBeenCalledWith('t1');
    });
  });

  describe('updateSettings', () => {
    it('should update settings', async () => {
      mockService.findOne.mockResolvedValue({
        id: 't1',
        settings: { old: true },
      });
      mockService.update.mockResolvedValue({});

      await controller.updateSettings('t1', { new: true } as any);
      expect(mockService.update).toHaveBeenCalledWith('t1', {
        settings: { old: true, new: true },
      });
    });
  });
});
