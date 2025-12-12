import { Repository, FindOptionsWhere } from 'typeorm';
import { NotFoundException, Logger } from '@nestjs/common';
import { ITenantScopedRepository } from './tenant-scoped-repository.interface';

/**
 * Generic TenantScopedRepository Implementation
 *
 * Wraps TypeORM Repository and automatically applies tenant filtering
 * to all operations. Eliminates repeated where: { tenantId } clauses.
 *
 * Usage:
 * const repo = new TenantScopedRepository(typeOrmRepository);
 * const items = await repo.findAll(tenantId);
 */
export class TenantScopedRepository<
  T extends { tenantId: string; id: string },
> implements ITenantScopedRepository<T> {
  private readonly logger = new Logger(TenantScopedRepository.name);
  private readonly entityName: string;

  constructor(private readonly repository: Repository<T>) {
    this.entityName = repository.metadata.name;
  }

  async findAll(tenantId: string): Promise<T[]> {
    this.logger.debug(`[${this.entityName}] findAll for tenant: ${tenantId}`);

    return this.repository.find({
      where: { tenantId } as FindOptionsWhere<T>,
    });
  }

  async findOne(id: string, tenantId: string): Promise<T | null> {
    this.logger.debug(
      `[${this.entityName}] findOne: id=${id}, tenant=${tenantId}`,
    );

    return this.repository.findOne({
      where: { id, tenantId } as FindOptionsWhere<T>,
    });
  }

  async findOneOrFail(id: string, tenantId: string): Promise<T> {
    const entity = await this.findOne(id, tenantId);

    if (!entity) {
      const message = `${this.entityName} with id ${id} not found for tenant ${tenantId}`;
      this.logger.warn(message);
      throw new NotFoundException(message);
    }

    return entity;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async create(data: Partial<T>, tenantId: string): Promise<T> {
    this.logger.debug(`[${this.entityName}] create for tenant: ${tenantId}`);

    // Merge tenantId into data
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const entityData = { ...data, tenantId } as any;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const entity = this.repository.create(entityData);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.repository.save(entity) as any;
  }

  async update(id: string, data: Partial<T>, tenantId: string): Promise<T> {
    this.logger.debug(
      `[${this.entityName}] update: id=${id}, tenant=${tenantId}`,
    );

    // Verify entity exists and belongs to tenant
    const entity = await this.findOneOrFail(id, tenantId);

    // Apply updates
    Object.assign(entity, data);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.repository.save(entity) as any;
  }

  async delete(id: string, tenantId: string): Promise<void> {
    this.logger.debug(
      `[${this.entityName}] delete: id=${id}, tenant=${tenantId}`,
    );

    const result = await this.repository.delete({
      id,
      tenantId,
    } as FindOptionsWhere<T>);

    if (result.affected === 0) {
      const message = `${this.entityName} with id ${id} not found for tenant ${tenantId}`;
      this.logger.warn(message);
      throw new NotFoundException(message);
    }
  }

  async count(tenantId: string): Promise<number> {
    this.logger.debug(`[${this.entityName}] count for tenant: ${tenantId}`);

    return this.repository.count({
      where: { tenantId } as FindOptionsWhere<T>,
    });
  }

  async findBy(criteria: Partial<T>, tenantId: string): Promise<T[]> {
    this.logger.debug(`[${this.entityName}] findBy for tenant: ${tenantId}`);

    const where = { ...criteria, tenantId } as FindOptionsWhere<T>;
    return this.repository.find({ where });
  }

  async findOneBy(criteria: Partial<T>, tenantId: string): Promise<T | null> {
    this.logger.debug(`[${this.entityName}] findOneBy for tenant: ${tenantId}`);

    const where = { ...criteria, tenantId } as FindOptionsWhere<T>;
    return this.repository.findOne({ where });
  }

  async findWithRelations(
    id: string,
    tenantId: string,
    relations: string[],
  ): Promise<T | null> {
    this.logger.debug(
      `[${this.entityName}] findWithRelations: id=${id}, tenant=${tenantId}, relations=${relations.join(', ')}`,
    );

    return this.repository.findOne({
      where: { id, tenantId } as FindOptionsWhere<T>,
      relations,
    });
  }

  /**
   * Access underlying TypeORM repository for advanced queries
   * Use sparingly - prefer typed methods above for better type safety
   *
   * Example (finding with query builder):
   * ```
   * const repo = this.tenantRepo.getRepository();
   * const items = await repo
   *   .createQueryBuilder('item')
   *   .where('item.tenantId = :tenantId', { tenantId })
   *   .andWhere('item.status = :status', { status: 'ACTIVE' })
   *   .getMany();
   * ```
   */
  getRepository(): Repository<T> {
    return this.repository;
  }
}
