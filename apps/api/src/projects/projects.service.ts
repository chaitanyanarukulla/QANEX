import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './project.entity';
import {
  ITenantScopedRepository,
  createTenantRepository,
} from '../common/repositories';

@Injectable()
export class ProjectsService {
  private readonly tenantRepo: ITenantScopedRepository<Project>;

  constructor(
    @InjectRepository(Project)
    projectsRepository: Repository<Project>,
  ) {
    this.tenantRepo = createTenantRepository(projectsRepository);
  }

  findAll(tenantId: string): Promise<Project[]> {
    return this.tenantRepo.findAll(tenantId);
  }

  create(project: Partial<Project>, tenantId: string): Promise<Project> {
    return this.tenantRepo.create(project, tenantId);
  }

  async count(tenantId: string): Promise<number> {
    return this.tenantRepo.count(tenantId);
  }

  async findOne(id: string, tenantId: string): Promise<Project | null> {
    return this.tenantRepo.findOne(id, tenantId);
  }
}
