/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { TenantScopedRepository } from './tenant-scoped.repository';

// Mock entity for testing
interface MockEntity {
  id: string;
  tenantId: string;
  name: string;
}

describe('TenantScopedRepository', () => {
  let repository: TenantScopedRepository<MockEntity>;
  let mockTypeOrmRepo: jest.Mocked<Repository<MockEntity>>;

  beforeEach(async () => {
    // Create mock TypeORM repository
    mockTypeOrmRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      metadata: { name: 'MockEntity' },
    } as any;

    repository = new TenantScopedRepository(mockTypeOrmRepo);
  });

  describe('findAll', () => {
    it('should return all entities for given tenant', async () => {
      const mockEntities: MockEntity[] = [
        { id: '1', tenantId: 'tenant-1', name: 'Entity 1' },
        { id: '2', tenantId: 'tenant-1', name: 'Entity 2' },
      ];
      mockTypeOrmRepo.find.mockResolvedValue(mockEntities);

      const result = await repository.findAll('tenant-1');

      expect(result).toEqual(mockEntities);
      expect(mockTypeOrmRepo.find).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1' },
      });
    });

    it('should return empty array when no entities exist', async () => {
      mockTypeOrmRepo.find.mockResolvedValue([]);

      const result = await repository.findAll('tenant-1');

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return entity when found', async () => {
      const mockEntity: MockEntity = {
        id: '1',
        tenantId: 'tenant-1',
        name: 'Entity 1',
      };
      mockTypeOrmRepo.findOne.mockResolvedValue(mockEntity);

      const result = await repository.findOne('1', 'tenant-1');

      expect(result).toEqual(mockEntity);
      expect(mockTypeOrmRepo.findOne).toHaveBeenCalledWith({
        where: { id: '1', tenantId: 'tenant-1' },
      });
    });

    it('should return null when entity not found', async () => {
      mockTypeOrmRepo.findOne.mockResolvedValue(null);

      const result = await repository.findOne('999', 'tenant-1');

      expect(result).toBeNull();
    });

    it('should not find entity from different tenant', async () => {
      mockTypeOrmRepo.findOne.mockResolvedValue(null);

      const result = await repository.findOne('1', 'different-tenant');

      expect(result).toBeNull();
      expect(mockTypeOrmRepo.findOne).toHaveBeenCalledWith({
        where: { id: '1', tenantId: 'different-tenant' },
      });
    });
  });

  describe('findOneOrFail', () => {
    it('should return entity when found', async () => {
      const mockEntity: MockEntity = {
        id: '1',
        tenantId: 'tenant-1',
        name: 'Entity 1',
      };
      mockTypeOrmRepo.findOne.mockResolvedValue(mockEntity);

      const result = await repository.findOneOrFail('1', 'tenant-1');

      expect(result).toEqual(mockEntity);
    });

    it('should throw NotFoundException when entity not found', async () => {
      mockTypeOrmRepo.findOne.mockResolvedValue(null);

      await expect(repository.findOneOrFail('999', 'tenant-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create and save entity with tenant', async () => {
      const entityData = { name: 'New Entity' };
      const savedEntity: MockEntity = {
        id: '1',
        tenantId: 'tenant-1',
        name: 'New Entity',
      };

      mockTypeOrmRepo.create.mockReturnValue(savedEntity as any);
      mockTypeOrmRepo.save.mockResolvedValue(savedEntity);

      const result = await repository.create(entityData, 'tenant-1');

      expect(result).toEqual(savedEntity);
      expect(mockTypeOrmRepo.create).toHaveBeenCalledWith({
        name: 'New Entity',
        tenantId: 'tenant-1',
      });
      expect(mockTypeOrmRepo.save).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update existing entity', async () => {
      const existingEntity: MockEntity = {
        id: '1',
        tenantId: 'tenant-1',
        name: 'Old Name',
      };
      const updatedEntity: MockEntity = {
        id: '1',
        tenantId: 'tenant-1',
        name: 'New Name',
      };

      mockTypeOrmRepo.findOne.mockResolvedValue(existingEntity);
      mockTypeOrmRepo.save.mockResolvedValue(updatedEntity);

      const result = await repository.update(
        '1',
        { name: 'New Name' },
        'tenant-1',
      );

      expect(result).toEqual(updatedEntity);
      expect(mockTypeOrmRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'New Name' }),
      );
    });

    it('should throw when entity not found', async () => {
      mockTypeOrmRepo.findOne.mockResolvedValue(null);

      await expect(
        repository.update('999', { name: 'New Name' }, 'tenant-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete entity when found', async () => {
      mockTypeOrmRepo.delete.mockResolvedValue({ affected: 1, raw: {} } as any);

      await expect(repository.delete('1', 'tenant-1')).resolves.not.toThrow();

      expect(mockTypeOrmRepo.delete).toHaveBeenCalledWith({
        id: '1',
        tenantId: 'tenant-1',
      });
    });

    it('should throw NotFoundException when entity not found', async () => {
      mockTypeOrmRepo.delete.mockResolvedValue({ affected: 0, raw: {} } as any);

      await expect(repository.delete('999', 'tenant-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('count', () => {
    it('should return count of entities for tenant', async () => {
      mockTypeOrmRepo.count.mockResolvedValue(5);

      const result = await repository.count('tenant-1');

      expect(result).toBe(5);
      expect(mockTypeOrmRepo.count).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1' },
      });
    });
  });

  describe('findBy', () => {
    it('should find entities matching criteria with tenant filtering', async () => {
      const mockEntities: MockEntity[] = [
        { id: '1', tenantId: 'tenant-1', name: 'Entity 1' },
      ];
      mockTypeOrmRepo.find.mockResolvedValue(mockEntities);

      const result = await repository.findBy({ name: 'Entity 1' }, 'tenant-1');

      expect(result).toEqual(mockEntities);
      expect(mockTypeOrmRepo.find).toHaveBeenCalledWith({
        where: { name: 'Entity 1', tenantId: 'tenant-1' },
      });
    });
  });

  describe('findOneBy', () => {
    it('should find single entity matching criteria with tenant filtering', async () => {
      const mockEntity: MockEntity = {
        id: '1',
        tenantId: 'tenant-1',
        name: 'Entity 1',
      };
      mockTypeOrmRepo.findOne.mockResolvedValue(mockEntity);

      const result = await repository.findOneBy(
        { name: 'Entity 1' },
        'tenant-1',
      );

      expect(result).toEqual(mockEntity);
      expect(mockTypeOrmRepo.findOne).toHaveBeenCalledWith({
        where: { name: 'Entity 1', tenantId: 'tenant-1' },
      });
    });
  });

  describe('findWithRelations', () => {
    it('should find entity with relations', async () => {
      const mockEntity: MockEntity = {
        id: '1',
        tenantId: 'tenant-1',
        name: 'Entity 1',
      };
      mockTypeOrmRepo.findOne.mockResolvedValue(mockEntity);

      const result = await repository.findWithRelations('1', 'tenant-1', [
        'relation1',
        'relation2',
      ]);

      expect(result).toEqual(mockEntity);
      expect(mockTypeOrmRepo.findOne).toHaveBeenCalledWith({
        where: { id: '1', tenantId: 'tenant-1' },
        relations: ['relation1', 'relation2'],
      });
    });
  });

  describe('getRepository', () => {
    it('should return underlying repository', () => {
      const result = repository.getRepository();
      expect(result).toBe(mockTypeOrmRepo);
    });
  });
});
