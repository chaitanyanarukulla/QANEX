/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FeatureFlagsService } from './feature-flags.service';
import { FeatureFlag } from './feature-flag.entity';

const mockFlagRepo: {
  findOne: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
  find: jest.Mock;
} = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
};

describe('FeatureFlagsService', () => {
  let service: FeatureFlagsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeatureFlagsService,
        {
          provide: getRepositoryToken(FeatureFlag),
          useValue: mockFlagRepo,
        },
      ],
    }).compile();

    service = module.get<FeatureFlagsService>(FeatureFlagsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('isEnabled', () => {
    it('should return true when flag exists and is enabled', async () => {
      const flag = { tenantId: 't1', key: 'darkMode', enabled: true };
      mockFlagRepo.findOne.mockResolvedValue(flag);

      const result = await service.isEnabled('t1', 'darkMode');

      expect(result).toBe(true);
      expect(mockFlagRepo.findOne).toHaveBeenCalledWith({
        where: { tenantId: 't1', key: 'darkMode' },
      });
    });

    it('should return false when flag exists but is disabled', async () => {
      const flag = { tenantId: 't1', key: 'darkMode', enabled: false };
      mockFlagRepo.findOne.mockResolvedValue(flag);

      const result = await service.isEnabled('t1', 'darkMode');

      expect(result).toBe(false);
    });

    it('should return false when flag does not exist', async () => {
      mockFlagRepo.findOne.mockResolvedValue(null);

      const result = await service.isEnabled('t1', 'nonExistent');

      expect(result).toBe(false);
    });
  });

  describe('setFlag', () => {
    it('should create new flag when it does not exist', async () => {
      const flag = {
        id: 'f1',
        tenantId: 't1',
        key: 'newFeature',
        enabled: true,
      } as any;

      mockFlagRepo.findOne.mockResolvedValue(null);
      mockFlagRepo.create.mockReturnValue(flag);
      mockFlagRepo.save.mockResolvedValue(flag);

      const result = await service.setFlag('t1', 'newFeature', true);

      expect(result).toEqual(flag);
      expect(mockFlagRepo.create).toHaveBeenCalledWith({
        tenantId: 't1',
        key: 'newFeature',
        enabled: true,
      });
      expect(mockFlagRepo.save).toHaveBeenCalledWith(flag);
    });

    it('should update existing flag', async () => {
      const flag = { tenantId: 't1', key: 'darkMode', enabled: false };
      const updated = { tenantId: 't1', key: 'darkMode', enabled: true };

      mockFlagRepo.findOne.mockResolvedValue(flag);
      mockFlagRepo.save.mockResolvedValue(updated);

      const result = await service.setFlag('t1', 'darkMode', true);

      expect(result).toEqual(updated);
      expect(mockFlagRepo.save).toHaveBeenCalledWith(flag);
    });

    it('should disable existing flag', async () => {
      const flag = { tenantId: 't1', key: 'darkMode', enabled: true };
      const updated = { tenantId: 't1', key: 'darkMode', enabled: false };

      mockFlagRepo.findOne.mockResolvedValue(flag);
      mockFlagRepo.save.mockResolvedValue(updated);

      const result = await service.setFlag('t1', 'darkMode', false);

      expect(result).toEqual(updated);
      expect(flag.enabled).toBe(false); // Flag object should be modified
    });
  });

  describe('getAll', () => {
    it('should return all flags for tenant', async () => {
      const flags = [
        { tenantId: 't1', key: 'darkMode', enabled: true },
        { tenantId: 't1', key: 'newFeature', enabled: false },
      ];

      mockFlagRepo.find.mockResolvedValue(flags);

      const result = await service.getAll('t1');

      expect(result).toEqual(flags);
      expect(mockFlagRepo.find).toHaveBeenCalledWith({
        where: { tenantId: 't1' },
      });
    });

    it('should return empty array when no flags exist', async () => {
      mockFlagRepo.find.mockResolvedValue([]);

      const result = await service.getAll('t1');

      expect(result).toEqual([]);
    });
  });
});
