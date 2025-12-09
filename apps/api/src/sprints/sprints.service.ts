import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sprint, SprintStatus } from './sprint.entity';

@Injectable()
export class SprintsService {
    constructor(
        @InjectRepository(Sprint)
        private sprintsRepository: Repository<Sprint>,
    ) { }

    async create(name: string, tenantId: string, capacity: number = 20): Promise<Sprint> {
        const sprint = this.sprintsRepository.create({
            name,
            tenantId,
            capacity,
            status: SprintStatus.PLANNED,
        });
        return this.sprintsRepository.save(sprint);
    }

    async findAll(tenantId: string): Promise<Sprint[]> {
        return this.sprintsRepository.find({ where: { tenantId } });
    }

    async findOne(id: string, tenantId: string): Promise<Sprint> {
        const sprint = await this.sprintsRepository.findOne({ where: { id, tenantId } });
        if (!sprint) {
            throw new NotFoundException(`Sprint ${id} not found`);
        }
        return sprint;
    }
}
