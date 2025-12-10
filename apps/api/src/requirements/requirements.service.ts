import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Requirement } from './requirement.entity';
import { RagService } from '../ai/rag.service';
import { AiProviderFactory } from '../ai/ai-provider.factory';
import { CreateRequirementDto } from './dto/create-requirement.dto';
import { UpdateRequirementDto } from './dto/update-requirement.dto';

@Injectable()
export class RequirementsService {
  constructor(
    @InjectRepository(Requirement)
    private readonly repo: Repository<Requirement>,
    private readonly ragService: RagService,
    private readonly aiFactory: AiProviderFactory,
  ) {}

  async create(
    createDto: CreateRequirementDto,
    user: any,
  ): Promise<Requirement> {
    const requirement = this.repo.create({
      ...createDto,
      tenantId: user.tenantId,
      // createdBy: user.id, // removed as entity doesn't have it shown in step 341 check.
      // version: 1, // removed
    });
    const saved = await this.repo.save(requirement);

    // Background: Index    // Auto-Index
    this.ragService
      .indexRequirement(saved.id, user.tenantId, saved.title, saved.content)
      .catch((e) => console.error('RAG Index failed', e));

    return saved;
  }

  async findAll(tenantId: string): Promise<Requirement[]> {
    return this.repo.find({
      where: { tenantId },
      order: { updatedAt: 'DESC' },
    });
  }

  async findOne(id: string, tenantId: string): Promise<Requirement> {
    const requirement = await this.repo.findOne({ where: { id, tenantId } });
    if (!requirement) {
      throw new NotFoundException(`Requirement ${id} not found`);
    }
    return requirement;
  }

  async update(
    id: string,
    updateDto: UpdateRequirementDto,
    user: any,
  ): Promise<Requirement> {
    const requirement = await this.findOne(id, user.tenantId);
    Object.assign(requirement, updateDto);

    const saved = await this.repo.save(requirement);

    // Update index
    this.ragService
      .indexRequirement(saved.id, user.tenantId, saved.title, saved.content)
      .catch(console.error);

    return saved;
  }

  async analyze(id: string, tenantId: string): Promise<Requirement> {
    const requirement = await this.findOne(id, tenantId);

    const { provider, config } = await this.aiFactory.getProvider(tenantId);

    // Pass tenant specific API key if available
    const analysis = await provider.analyzeRequirement(
      requirement.content || requirement.title,
      tenantId,
      config.apiKey,
    );

    requirement.rqs = {
      score: analysis.score,
      clarity: analysis.clarity,
      completeness: analysis.completeness,
      testability: analysis.testability,
      consistency: analysis.consistency,
      feedback: analysis.feedback || [],
    };

    return this.repo.save(requirement);
  }

  async assignToSprint(
    id: string,
    sprintId: string,
    tenantId: string,
  ): Promise<Requirement> {
    const requirement = await this.findOne(id, tenantId);
    requirement.sprintId = sprintId;
    return this.repo.save(requirement);
  }

  // Removed getAiSettings as logic is moved to factory
}
