import { Repository } from 'typeorm';
import { TenantScopedRepository } from './tenant-scoped.repository';
import { ITenantScopedRepository } from './tenant-scoped-repository.interface';

/**
 * Factory function to create a TenantScopedRepository
 *
 * Usage:
 * ```typescript
 * constructor(
 *   @InjectRepository(Project) projectRepository: Repository<Project>,
 * ) {
 *   this.tenantRepo = createTenantRepository(projectRepository);
 * }
 * ```
 */
export function createTenantRepository<
  T extends { tenantId: string; id: string },
>(repository: Repository<T>): ITenantScopedRepository<T> {
  return new TenantScopedRepository(repository);
}
