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

// DDD Imports
import { Requirement as RequirementAggregate } from './domain/requirement.aggregate';
import { EventStorePublisher } from '../common/event-store/event-store-publisher';
import { DomainEventPublisher } from '../common/domain/domain-event.publisher';

export interface TaskDto {
  title: string;
  description: string;
  type?: string;
  priority?: string;
  suggestedRole?: string;
  estimatedHours?: number;
}

/**
 * RequirementsService - Refactored for DDD & Event-Driven Architecture
 *
 * This service now uses DDD aggregates and publishes domain events to EventStore.
 * All state changes are captured as immutable events for complete audit trail.
 */
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
    private readonly eventStorePublisher: EventStorePublisher,
    private readonly eventPublisher: DomainEventPublisher,
  ) {}

  async create(
    createDto: CreateRequirementDto,
    user: IAuthUser,
  ): Promise<Requirement> {
    const { tasks, ...reqData } = createDto;

    // 1. Create Requirement aggregate (validates inputs)
    const aggregate = RequirementAggregate.create({
      title: reqData.title,
      content: reqData.content,
      priority: reqData.priority || 'MEDIUM',
      type: reqData.type || 'FUNCTIONAL',
      acceptanceCriteria: reqData.acceptanceCriteria || [],
      tenantId: user.tenantId,
    });

    // 2. Save entity
    const requirement = this.repo.create({
      id: aggregate.id,
      ...reqData,
      tenantId: user.tenantId,
    });
    const saved = await this.repo.save(requirement);

    // 3. Publish domain events (automatically persisted to EventStore)
    await this.eventStorePublisher.publishAll(
      aggregate.getDomainEvents(),
      user.tenantId,
    );
    aggregate.clearDomainEvents();

    // 4. Create tasks if provided
    if (tasks && tasks.length > 0) {
      await this.addTasks(saved.id, tasks as TaskDto[], user.tenantId);
    }

    // 5. Background: Index in RAG
    this.ragService
      .indexRequirement(saved.id, user.tenantId, saved.title, saved.content)
      .catch((error: unknown) => {
        this.logger.error('RAG Index failed', {
          context: 'RequirementsService',
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        });
      });

    this.logger.debug(`Created requirement ${saved.id} with domain aggregate`);
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
      .catch((error: unknown) => {
        this.logger.error('Background task failed', {
          context: 'RequirementsService',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      });

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
    // this.ragService.removeRequirement(id).catch((e) => {
    //   this.logger.error('Background task failed', {
    //     context: 'RequirementsService',
    //     error: e.message,
    //   });
    // });
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

      const itemType = typeStr in ['feature', 'bug'] ? typeStr : 'task';
      const itemPriority =
        priorityStr in ['CRITICAL', 'HIGH', 'LOW'] ? priorityStr : 'MEDIUM';
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
    } catch (error: unknown) {
      this.logger.error(
        `[AI-Req] Failed to generate tasks for requirement ${id}`,
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
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
    await this.findOne(id, tenantId);

    // Update all tasks linked to this requirement to have status BACKLOG and sprintId null
    // We can do this with a single update query
    const result = await this.sprintItemRepo.update(
      { requirementId: id, tenantId },
      {
        status: SprintItemStatus.BACKLOG,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        sprintId: null as any, // TypeORM requires this cast for nullable relations
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

  /**
   * Approve requirement
   *
   * Triggers workflow:
   * 1. Requirement state changes to APPROVED
   * 2. RequirementApproved event published
   * 3. Subscribers notified (may trigger task generation)
   *
   * @param id - Requirement ID
   * @param tenantId - Tenant identifier
   * @returns Updated requirement
   */
  async approve(id: string, tenantId: string): Promise<Requirement> {
    try {
      const requirement = await this.findOne(id, tenantId);

      // 1. Reconstruct aggregate and approve
      const aggregate = this.reconstructAggregate(requirement);
      aggregate.approve();

      // 2. Update entity
      requirement.state = RequirementState.APPROVED;
      const saved = await this.repo.save(requirement);

      // 3. Publish events
      await this.eventStorePublisher.publishAll(
        aggregate.getDomainEvents(),
        tenantId,
      );
      aggregate.clearDomainEvents();

      this.logger.log(
        `Approved requirement ${id} - RequirementApproved event published`,
      );

      return saved;
    } catch (error: unknown) {
      this.logger.error(
        `Failed to approve requirement: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Reconstruct Requirement aggregate from entity
   *
   * This is a hybrid approach: loads entity from DB, reconstructs aggregate
   * for applying business logic and generating events.
   *
   * @private
   */
  private reconstructAggregate(entity: Requirement): RequirementAggregate {
    return RequirementAggregate.recreate({
      id: entity.id,
      title: entity.title,
      content: entity.content,
      status: entity.state,
      priority: entity.priority,
      type: entity.type,
      acceptanceCriteria: entity.acceptanceCriteria || [],
      rqs: entity.rqs,
      tenantId: entity.tenantId,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }
}
