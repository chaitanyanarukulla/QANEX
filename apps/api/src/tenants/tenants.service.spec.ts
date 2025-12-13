/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { TenantsService } from './tenants.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Tenant } from './tenant.entity';

const mockRepo: {
  create: jest.Mock;
  save: jest.Mock;
  find: jest.Mock;
  findOneBy: jest.Mock;
  update: jest.Mock;
} = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOneBy: jest.fn(),
  update: jest.fn(),
};

describe('TenantsService', () => {
  let service: TenantsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantsService,
        {
          provide: getRepositoryToken(Tenant),
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<TenantsService>(TenantsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create tenant', async () => {
      const t = { name: 'Acme', slug: 'acme' };
      mockRepo.create.mockReturnValue(t);
      mockRepo.save.mockResolvedValue(t);

      const result = await service.create('Acme', 'acme');
      expect(result).toEqual(t);
    });
  });

  describe('findAll', () => {
    it('should return tenants', async () => {
      mockRepo.find.mockResolvedValue([]);
      const result = await service.findAll();
      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return tenant', async () => {
      mockRepo.findOneBy.mockResolvedValue({ id: 't1' });
      const result = await service.findOne('t1');
      expect(result).toEqual({ id: 't1' });
    });
  });

  describe('update', () => {
    it('should update tenant', async () => {
      mockRepo.update.mockResolvedValue({});
      mockRepo.findOneBy.mockResolvedValue({ id: 't1', name: 'New Name' });

      const result = await service.update('t1', { name: 'New Name' });
      expect(result.name).toBe('New Name');
    });

    it('should throw if not found', async () => {
      mockRepo.update.mockResolvedValue({});
      mockRepo.findOneBy.mockResolvedValue(null);

      await expect(service.update('t1', {})).rejects.toThrow();
    });
  });
});
