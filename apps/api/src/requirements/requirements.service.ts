import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Requirement } from './requirement.entity';
import { SprintItem, SprintItemStatus } from '../sprints/sprint-item.entity';
import { RagService } from '../ai/rag.service';
import { AiProviderFactory } from '../ai/providers';
import { CreateRequirementDto } from './dto/create-requirement.dto';
import { UpdateRequirementDto } from './dto/update-requirement.dto';
import { IAuthUser } from '../auth/interfaces/auth-user.interface';

@Injectable()
export class RequirementsService {
  constructor(
    @InjectRepository(Requirement)
    private readonly repo: Repository<Requirement>,
    @InjectRepository(SprintItem)
    private readonly sprintItemRepo: Repository<SprintItem>,
    private readonly ragService: RagService,
    private readonly aiFactory: AiProviderFactory,
  ) {}

  async create(
    createDto: CreateRequirementDto,
    user: IAuthUser,
  ): Promise<Requirement> {
    const { tasks, ...reqData } = createDto;

    // Create Requirement
    const requirement = this.repo.create({
      ...reqData,
      tenantId: user.tenantId,
      // createdBy: user.id,
    });
    const saved = await this.repo.save(requirement);

    // Create Tasks if any
    if (tasks && tasks.length > 0) {
      for (const task of tasks) {
        await this.sprintItemRepo.save(
          this.sprintItemRepo.create({
            title: task.title,
            description: task.description,
            type: ['feature', 'bug', 'task'].includes(task.type?.toLowerCase())
              ? task.type.toLowerCase()
              : 'task',
            status: 'todo' as SprintItemStatus,
            priority: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(
              task.priority?.toUpperCase(),
            )
              ? task.priority.toUpperCase()
              : 'MEDIUM',
            suggestedRole: task.suggestedRole,
            estimatedHours: task.estimatedHours,
            requirementId: saved.id,
            tenantId: user.tenantId,
          }),
        );
      }
    }

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
    user: IAuthUser,
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

    const { provider } = await this.aiFactory.getProvider(tenantId);

    // Analyze requirement with new provider architecture
    const analysis = await provider.analyzeRequirement(
      requirement.content || requirement.title,
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
