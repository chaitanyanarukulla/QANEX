import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Requirement, RequirementState } from './requirement.entity';
import type { AiProvider } from '../ai/ai.interface';
import { AI_PROVIDER_TOKEN } from '../ai/ai.interface';
import { RagService } from '../ai/rag.service';
import { Inject } from '@nestjs/common';

@Injectable()
export class RequirementsService {
    constructor(
        @InjectRepository(Requirement)
        private requirementsRepository: Repository<Requirement>,
        @Inject(AI_PROVIDER_TOKEN) private aiProvider: AiProvider,
        private ragService: RagService,
    ) { }

    async create(title: string, content: string, tenantId: string): Promise<Requirement> {
        const requirement = this.requirementsRepository.create({
            title,
            content,
            tenantId,
            state: RequirementState.DRAFT,
        });
        const saved = await this.requirementsRepository.save(requirement);

        // Background: Index via RAG
        this.ragService.indexRequirement(saved.id, tenantId, title, content).catch(console.error);

        return saved;
    }

    async findAll(tenantId: string): Promise<Requirement[]> {
        return this.requirementsRepository.find({ where: { tenantId } });
    }

    async findOne(id: string, tenantId: string): Promise<Requirement> {
        const requirement = await this.requirementsRepository.findOne({ where: { id, tenantId } });
        if (!requirement) {
            throw new NotFoundException(`Requirement ${id} not found`);
        }
        return requirement;
    }

    async analyze(id: string, tenantId: string): Promise<Requirement> {
        const requirement = await this.findOne(id, tenantId);

        // Simulate AI Call
        const rqs = await this.aiProvider.analyzeRequirement(requirement.content);

        requirement.rqs = rqs;
        if (rqs.score > 80) {
            requirement.state = RequirementState.READY;
        } else {
            requirement.state = RequirementState.NEEDS_REVISION;
        }

        return this.requirementsRepository.save(requirement);
    }

    async assignToSprint(id: string, sprintId: string, tenantId: string): Promise<Requirement> {
        const requirement = await this.findOne(id, tenantId);
        requirement.sprintId = sprintId;
        return this.requirementsRepository.save(requirement);
    }
}
