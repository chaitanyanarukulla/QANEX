/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { OrgRole } from './user-tenant.entity';

const mockService = {
  create: jest.fn(),
  findAll: jest.fn(),
  updateRole: jest.fn(),
  removeMember: jest.fn(),
  update: jest.fn(),
};

const mockReq = {
  user: {
    userId: 'u1',
    tenantId: 't1',
  },
} as any;

describe('UsersController', () => {
  let controller: UsersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockService }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create user', async () => {
      const dto = { email: 'e', firstName: 'f', lastName: 'l' };
      mockService.create.mockResolvedValue(dto);
      await controller.create(dto, mockReq);
      expect(mockService.create).toHaveBeenCalledWith(
        'e',
        'f',
        'l',
        't1',
        undefined,
      );
    });
  });

  describe('findAll', () => {
    it('should return users', async () => {
      mockService.findAll.mockResolvedValue([]);
      await controller.findAll(mockReq);
      expect(mockService.findAll).toHaveBeenCalledWith('t1');
    });
  });

  describe('updateRole', () => {
    it('should update role', async () => {
      mockService.updateRole.mockResolvedValue({});
      await controller.updateRole('u2', OrgRole.ORG_ADMIN, mockReq);
      expect(mockService.updateRole).toHaveBeenCalledWith(
        'u2',
        't1',
        OrgRole.ORG_ADMIN,
      );
    });
  });

  describe('removeMember', () => {
    it('should remove member', async () => {
      mockService.removeMember.mockResolvedValue({});
      await controller.removeMember('u2', mockReq);
      expect(mockService.removeMember).toHaveBeenCalledWith('u2', 't1');
    });
  });

  describe('update', () => {
    it('should update user', async () => {
      mockService.update.mockResolvedValue({});
      await controller.update('u2', { firstName: 'New' });
      expect(mockService.update).toHaveBeenCalledWith('u2', {
        firstName: 'New',
      });
    });
  });
});
