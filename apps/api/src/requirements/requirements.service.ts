import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Requirement, RequirementState } from './requirement.entity';
import {
  SprintItem,
  SprintItemStatus,
  SprintItemType,
  SprintItemPriority,
} from '../sprints/sprint-item.entity';
import { RagService } from '../ai/rag.service';
import { AiProviderFactory } from '../ai/providers';
import { CreateRequirementDto } from './dto/create-requirement.dto';
import { UpdateRequirementDto } from './dto/update-requirement.dto';
import { IAuthUser } from '../auth/interfaces/auth-user.interface';

export interface TaskDto {
  title: string;
  description: string;
  type?: string;
  priority?: string;
  suggestedRole?: string;
  estimatedHours?: number;
}

@Injectable()
export class RequirementsService {
  private readonly logger = new Logger(RequirementsService.name);

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
      for (const task of tasks as TaskDto[]) {
        const typeStr = (task.type || 'task').toLowerCase();
        const priorityStr = (task.priority || 'MEDIUM').toUpperCase();

        const itemType = ['feature', 'bug', 'task'].includes(typeStr)
          ? typeStr
          : 'task';
        const itemPriority = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(
          priorityStr,
        )
          ? priorityStr
          : 'MEDIUM';

        await this.sprintItemRepo.save(
          this.sprintItemRepo.create({
            title: task.title,
            description: task.description || '',
            type: itemType as SprintItemType,
            status: SprintItemStatus.TODO,
            priority: itemPriority as SprintItemPriority,
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
      relations: ['sprintItems', 'sourceDocument'],
      order: { updatedAt: 'DESC' },
    });
  }

  async findOne(id: string, tenantId: string): Promise<Requirement> {
    const requirement = await this.repo.findOne({
      where: { id, tenantId },
      relations: ['sprintItems', 'parent', 'children'],
    });
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

  async remove(id: string, tenantId: string): Promise<void> {
    const result = await this.repo.delete({ id, tenantId });
    if (result.affected === 0) {
      throw new NotFoundException(`Requirement ${id} not found`);
    }

    // Optional: Also remove from RAG index
    // this.ragService.removeRequirement(id).catch(console.error);
  }

  async addTasks(
    id: string,
    tasks: TaskDto[],
    tenantId: string,
  ): Promise<SprintItem[]> {
    const requirement = await this.findOne(id, tenantId);

    const createdItems: SprintItem[] = [];

    for (const task of tasks) {
      const typeStr = (task.type || 'task').toLowerCase();
      const priorityStr = (task.priority || 'MEDIUM').toUpperCase();

      const itemType = ['feature', 'bug', 'task'].includes(typeStr)
        ? typeStr
        : 'task';
      const itemPriority = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(
        priorityStr,
      )
        ? priorityStr
        : 'MEDIUM';

      const savedItem = await this.sprintItemRepo.save(
        this.sprintItemRepo.create({
          title: task.title,
          description: task.description || '',
          type: itemType as SprintItemType,
          status: SprintItemStatus.TODO,
          priority: itemPriority as SprintItemPriority,
          suggestedRole: task.suggestedRole,
          estimatedHours: task.estimatedHours,
          requirementId: requirement.id,
          tenantId,
        }),
      );
      createdItems.push(savedItem);
    }

    return createdItems;
  }

  async generateTasks(id: string, tenantId: string): Promise<SprintItem[]> {
    const requirement = await this.findOne(id, tenantId);

    // Only allow for APPROVED requirements (optional check, but good for workflow enforcement)
    // if (requirement.state !== RequirementState.APPROVED) {
    //   throw new BadRequestException('Requirement must be approved before generating tasks');
    // }

    const { provider, config } = await this.aiFactory.getProvider(tenantId);

    const prompt = `
      You are a Technical Lead.
      Analyze the following APPROVED requirement and generate detailed implementation tasks.
      
      Requirement: ${requirement.title}
      Details: ${requirement.content}
      Acceptance Criteria: ${JSON.stringify(requirement.acceptanceCriteria)}

      Goal: Create a list of specific Frontend (FE), Backend (BE), and QA tasks needed to implement this requirement.
      
      Output JSON format:
      {
        "tasks": [
            {
                "title": "FE|BE|QA: Task Title",
                "description": "Detailed technical instruction",
                "type": "task" | "feature" | "bug",
                "suggestedRole": "Frontend" | "Backend" | "QA" | "DevOps",
                "estimatedHours": number
            }
        ]
      }
    `;

    const start = Date.now();
    this.logger.log(`[AI-Req] Generating tasks for requirement ${id}`, {
      context: 'RequirementsService',
      tenantId,
      requirementId: id,
    });

    try {
      const response = await provider.chat(
        [{ role: 'user', content: prompt }],
        {
          model: config.model,
          temperature: 0.2,
          responseFormat: 'json',
          maxTokens: 2048,
        },
        config.apiKey,
      );

      const result = JSON.parse(response.content) as { tasks: TaskDto[] };
      const count = result.tasks?.length || 0;

      this.logger.log(
        `[AI-Req] Generated ${count} tasks in ${Date.now() - start}ms`,
        {
          context: 'RequirementsService',
          tenantId,
          requirementId: id,
          taskCount: count,
        },
      );

      // Use addTasks to save them
      if (result.tasks && result.tasks.length > 0) {
        return this.addTasks(id, result.tasks, tenantId);
      }
      return [];
    } catch (error) {
      this.logger.error(
        `[AI-Req] Failed to generate tasks for requirement ${id}`,
        {
          error: (error as Error).message,
          stack: (error as Error).stack,
          tenantId,
          requirementId: id,
        },
      );
      throw error;
    }
  }

  async moveTasksToBacklog(
    id: string,
    tenantId: string,
  ): Promise<{ count: number }> {
    const requirement = await this.findOne(id, tenantId);

    // Update all tasks linked to this requirement to have status BACKLOG and sprintId null
    // We can do this with a single update query
    const result = await this.sprintItemRepo.update(
      { requirementId: id, tenantId },
      {
        status: SprintItemStatus.BACKLOG,
        sprintId: null as any,
      },
    );

    // Update requirement status to BACKLOGGED
    await this.repo.update(
      { id, tenantId },
      { state: RequirementState.BACKLOGGED },
    );

    this.logger.log(
      `[Req-Backlog] Moved ${result.affected} tasks to backlog for requirement ${id}`,
      { tenantId, requirementId: id },
    );

    return { count: result.affected || 0 };
  }
}
