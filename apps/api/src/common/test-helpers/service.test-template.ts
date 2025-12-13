/**
 * Reusable Test Helper Template for Services using TenantScopedRepository
 *
 * Usage:
 * ```typescript
 * import { createMockTenantRepository } from '../common/test-helpers/service.test-template';
 *
 * const mockRepo = createMockTenantRepository<MyEntity>();
 *
 * const module = await Test.createTestingModule({
 *   providers: [
 *     MyService,
 *     { provide: getRepositoryToken(MyEntity), useValue: mockRepo.typeOrmRepo }
 *   ]
 * }).compile();
 * ```
 *
 * This eliminates boilerplate for:
 * - Creating mock TypeORM repositories
 * - Setting up TenantScopedRepository wrappers
 * - Mocking common operations (find, create, save, etc.)
 */

/**
 * Create a mock TypeORM repository suitable for TenantScopedRepository wrapping
 *
 * Returns an object with:
 * - All mock methods (find, findOne, create, save, count, delete, etc.)
 * - metadata for entity name
 * - All methods pre-configured with Jest mocks for easy chaining
 */
export function createMockTenantRepository<
  T extends { tenantId: string; id: string },
>() {
  const typeOrmRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    count: jest.fn(),
    delete: jest.fn(),
    metadata: { name: (null as any).constructor.name || 'Entity' },
  };

  return {
    typeOrmRepo,

    /**
     * Helper: Mock a successful findAll response
     */
    mockFindAll: (entities: T[], _tenantId: string) => {
      typeOrmRepo.find.mockResolvedValueOnce(entities);
      return typeOrmRepo;
    },

    /**
     * Helper: Mock a successful findOne response
     */
    mockFindOne: (entity: T, _id: string, _tenantId: string) => {
      typeOrmRepo.findOne.mockResolvedValueOnce(entity);
      return typeOrmRepo;
    },

    /**
     * Helper: Mock a successful create response
     */
    mockCreate: (entity: T) => {
      typeOrmRepo.create.mockReturnValueOnce(entity);
      typeOrmRepo.save.mockResolvedValueOnce(entity);
      return typeOrmRepo;
    },

    /**
     * Helper: Mock a count response
     */
    mockCount: (count: number) => {
      typeOrmRepo.count.mockResolvedValueOnce(count);
      return typeOrmRepo;
    },

    /**
     * Helper: Reset all mocks
     */
    reset: () => {
      jest.clearAllMocks();
    },
  };
}

/**
 * Common test assertions for tenant-scoped services
 *
 * Usage:
 * ```typescript
 * expect(mockRepo.typeOrmRepo.find).toHaveBeenCalledWith({
 *   where: { tenantId: 't1' }
 * });
 *
 * assertTenantIsolation(mockRepo.typeOrmRepo.find, 't1');
 * ```
 */
export function assertTenantIsolation(
  mockFn: jest.Mock,
  tenantId: string,
  callIndex = 0,
) {
  const call = mockFn.mock.calls[callIndex];
  if (!call) {
    throw new Error(`Mock function not called`);
  }

  const where = call[0]?.where;
  if (!where || where.tenantId !== tenantId) {
    throw new Error(
      `Expected tenant isolation with tenantId="${tenantId}", got where=${JSON.stringify(where)}`,
    );
  }
}

/**
 * Assert that a create/update operation properly handles tenantId
 */
export function assertTenantInData(
  mockFn: jest.Mock,
  expectedTenantId: string,
) {
  const call = mockFn.mock.calls[0];
  if (!call) {
    throw new Error(`Mock function not called`);
  }

  const data = call[0];
  if (!data || data.tenantId !== expectedTenantId) {
    throw new Error(
      `Expected tenantId="${expectedTenantId}" in data, got ${JSON.stringify(data)}`,
    );
  }
}
