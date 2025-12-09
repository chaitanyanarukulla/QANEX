import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './project.entity';

@Injectable()
export class ProjectsService {
    constructor(
        @InjectRepository(Project)
        private projectsRepository: Repository<Project>,
    ) { }

    findAll(tenantId: string): Promise<Project[]> {
        return this.projectsRepository.find({ where: { tenantId } });
    }

    create(project: Partial<Project>): Promise<Project> {
        return this.projectsRepository.save(project);
    }

    async count(tenantId: string): Promise<number> {
        return this.projectsRepository.count({ where: { tenantId } });
    }
}
