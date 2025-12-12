/**
 * TenantScopedRepository Interface
 *
 * Defines the contract for tenant-aware data access operations.
 * All operations automatically include tenant filtering.
 */
export interface ITenantScopedRepository<
  T extends { tenantId: string; id: string },
> {
  /**
   * Find all entities for a given tenant
   */
  findAll(tenantId: string): Promise<T[]>;

  /**
   * Find a single entity by ID and tenant
   * Returns null if not found
   */
  findOne(id: string, tenantId: string): Promise<T | null>;

  /**
   * Find a single entity by ID and tenant
   * Throws NotFoundException if not found
   */
  findOneOrFail(id: string, tenantId: string): Promise<T>;

  /**
   * Create and save a new entity for a tenant
   */
  create(data: Partial<T>, tenantId: string): Promise<T>;

  /**
   * Update an existing entity
   */
  update(id: string, data: Partial<T>, tenantId: string): Promise<T>;

  /**
   * Delete an entity by ID and tenant
   * Throws NotFoundException if not found
   */
  delete(id: string, tenantId: string): Promise<void>;

  /**
   * Count entities for a tenant
   */
  count(tenantId: string): Promise<number>;

  /**
   * Find entities matching criteria (with automatic tenant filtering)
   */
  findBy(criteria: Partial<T>, tenantId: string): Promise<T[]>;

  /**
   * Find a single entity matching criteria (with automatic tenant filtering)
   */
  findOneBy(criteria: Partial<T>, tenantId: string): Promise<T | null>;

  /**
   * Find with relations (useful for complex queries)
   */
  findWithRelations(
    id: string,
    tenantId: string,
    relations: string[],
  ): Promise<T | null>;

  /**
   * Access underlying repository for advanced queries
   * Use sparingly - prefer typed methods above
   */
  getRepository(): any;
}
