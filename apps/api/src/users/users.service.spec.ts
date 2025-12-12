import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UserTenant } from './user-tenant.entity';
import { PlanLimitsService } from '../billing/plan-limits.service';
import { NotFoundException } from '@nestjs/common';

const mockUserRepo = {
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  findOneBy: jest.fn(),
};

const mockUserTenantRepo = {
  create: jest.fn(),
  save: jest.fn(),
  count: jest.fn(),
  findOne: jest.fn(),
  remove: jest.fn(),
};

const mockPlanLimitsService = {
  assertCanAddUser: jest.fn(),
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepo,
        },
        {
          provide: getRepositoryToken(UserTenant),
          useValue: mockUserTenantRepo,
        },
        {
          provide: PlanLimitsService,
          useValue: mockPlanLimitsService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create user and membership if not exists', async () => {
      mockUserTenantRepo.count.mockResolvedValue(0);
      mockPlanLimitsService.assertCanAddUser.mockResolvedValue(true);

      mockUserRepo.findOne.mockResolvedValueOnce(null); // User not found initially

      const newUser = { id: 'u1', email: 'test@test.com' };
      mockUserRepo.create.mockReturnValue(newUser);
      mockUserRepo.save.mockResolvedValue(newUser);

      mockUserTenantRepo.create.mockReturnValue({});
      mockUserTenantRepo.save.mockResolvedValue({});

      // Second call to findByEmail returns the user
      mockUserRepo.findOne.mockResolvedValue(newUser);

      const result = await service.create(
        'test@test.com',
        'First',
        'Last',
        't1',
      );
      expect(result).toEqual(newUser);
      expect(mockUserRepo.create).toHaveBeenCalled();
      expect(mockUserTenantRepo.create).toHaveBeenCalled();
    });

    it('should use existing user if email exists', async () => {
      mockUserTenantRepo.count.mockResolvedValue(0);
      mockUserRepo.findOne.mockResolvedValue({
        id: 'u1',
        email: 'exist@test.com',
      });

      await service.create('exist@test.com', 'First', 'Last', 't1');

      expect(mockUserRepo.create).not.toHaveBeenCalled();
      expect(mockUserTenantRepo.create).toHaveBeenCalled(); // Should still create membership
    });
  });

  describe('findOne', () => {
    it('should return user', async () => {
      const user = { id: 'u1' };
      mockUserRepo.findOneBy.mockResolvedValue(user);
      const result = await service.findOne('u1');
      expect(result).toEqual(user);
    });

    it('should throw if not found', async () => {
      mockUserRepo.findOneBy.mockResolvedValue(null);
      await expect(service.findOne('u1')).rejects.toThrow(NotFoundException);
    });
  });
});
