import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { RequirementState } from '../requirements/requirement.entity';
import { Sprint, SprintStatus } from './sprint.entity';
import {
  SprintItem,
  SprintItemStatus,
  SprintItemType,
  SprintItemPriority,
} from './sprint-item.entity';
import { Sprint as SprintAggregate } from './domain/sprint.aggregate';
import { EventStorePublisher } from '../common/event-store/event-store-publisher';
import { DomainEventPublisher } from '../common/domain/domain-event.publisher';
import { SprintCapacity } from './domain/value-objects/sprint-capacity.vo';

@Injectable()
export class SprintsService {
  constructor(
    @InjectRepository(Sprint)
    private sprintsRepository: Repository<Sprint>,
    @InjectRepository(SprintItem)
    private sprintItemsRepository: Repository<SprintItem>,
    private readonly eventStorePublisher: EventStorePublisher,
    private readonly eventPublisher: DomainEventPublisher,
  ) {}

  // ===== Sprint Management =====

  async create(
    name: string,
    tenantId: string,
    capacity: number = 20,
    goal?: string,
    startDate?: Date,
    endDate?: Date,
    userId?: string,
  ): Promise<Sprint> {
    // Step 1: Create aggregate (validates inputs)
    // Note: Sprint aggregate uses 'capacity' as story points
    // If startDate/endDate not provided, default to 2-week sprint
    const now = new Date();
    const defaultStart = startDate || now;
    const defaultEnd =
      endDate || new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    const aggregate = SprintAggregate.create({
      id: '', // Will be set by repository on insert
      tenantId,
      name,
      capacity,
      startDate: defaultStart,
      endDate: defaultEnd,
      description: goal,
      userId,
    });

    // Step 2: Save entity (keeping backward compatibility)
    const sprintData = this.sprintsRepository.create({
      name,
      tenantId,
      capacity,
      goal,
      startDate: defaultStart,
      endDate: defaultEnd,
      status: SprintStatus.PLANNED,
    });
    const saved = await this.sprintsRepository.save(sprintData);

    // Step 3: Update aggregate with generated ID
    aggregate.id = saved.id;

    // Step 4: Publish events (auto-persisted to EventStore)
    await this.eventStorePublisher.publishAll(
      aggregate.getDomainEvents(),
      tenantId,
    );
    aggregate.clearDomainEvents();

    return saved;
  }

  async findAll(tenantId: string): Promise<Sprint[]> {
    return this.sprintsRepository.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, tenantId: string): Promise<Sprint> {
    const sprint = await this.sprintsRepository.findOne({
      where: { id, tenantId },
    });
    if (!sprint) {
      throw new NotFoundException(`Sprint ${id} not found`);
    }
    return sprint;
  }

  async start(id: string, tenantId: string, userId?: string): Promise<Sprint> {
    // Step 1: Fetch and reconstruct aggregate
    const sprint = await this.findOne(id, tenantId);
    const aggregate = this.reconstructAggregate(sprint);

    // Step 2: Apply domain logic (validates state transitions)
    aggregate.start(userId);

    // Step 3: Update entity
    sprint.status = SprintStatus.ACTIVE;
    if (!sprint.startDate) {
      sprint.startDate = new Date();
    }
    if (!sprint.endDate) {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 14);
      sprint.endDate = endDate;
    }
    const saved = await this.sprintsRepository.save(sprint);

    // Step 4: Publish events (auto-persisted to EventStore)
    await this.eventStorePublisher.publishAll(
      aggregate.getDomainEvents(),
      tenantId,
    );
    aggregate.clearDomainEvents();

    return saved;
  }

  async complete(
    id: string,
    tenantId: string,
    metrics?: {
      completedItems?: number;
      completedStoryPoints?: number;
      velocity?: number;
    },
    userId?: string,
  ): Promise<Sprint> {
    // Step 1: Fetch and reconstruct aggregate
    const sprint = await this.findOne(id, tenantId);
    const aggregate = this.reconstructAggregate(sprint);

    // Step 2: Get actual metrics from sprint items
    const items = await this.sprintItemsRepository.find({
      where: { sprintId: id, tenantId },
    });

    const completedItems =
      metrics?.completedItems ||
      items.filter((i) => i.status === SprintItemStatus.DONE).length;
    const completedStoryPoints = metrics?.completedStoryPoints || 0;
    const velocity =
      metrics?.velocity ||
      items.filter((i) => i.status === SprintItemStatus.DONE).length;

    // Step 3: Apply domain logic (validates state transitions)
    aggregate.complete(
      {
        completedItems,
        completedStoryPoints,
        velocity,
      },
      userId,
    );

    // Step 4: Update entity
    sprint.status = SprintStatus.COMPLETED;
    sprint.velocity = velocity;
    const saved = await this.sprintsRepository.save(sprint);

    // Step 5: Publish events (auto-persisted to EventStore)
    await this.eventStorePublisher.publishAll(
      aggregate.getDomainEvents(),
      tenantId,
    );
    aggregate.clearDomainEvents();

    return saved;
  }

  async updateStatus(
    id: string,
    tenantId: string,
    status: SprintStatus,
  ): Promise<Sprint> {
    // Delegate to specific methods
    if (status === SprintStatus.ACTIVE) {
      return this.start(id, tenantId);
    }
    if (status === SprintStatus.COMPLETED) {
      return this.complete(id, tenantId);
    }

    const sprint = await this.findOne(id, tenantId);
    sprint.status = status;
    return this.sprintsRepository.save(sprint);
  }

  async update(
    id: string,
    tenantId: string,
    data: Partial<Sprint>,
  ): Promise<Sprint> {
    const sprint = await this.findOne(id, tenantId);
    Object.assign(sprint, data);
    return this.sprintsRepository.save(sprint);
  }

  // ===== Sprint Item Management =====

  async addItem(
    sprintId: string | null,
    tenantId: string,
    data: {
      title: string;
      description?: string;
      type?: SprintItemType;
      priority?: SprintItemPriority;
      status?: SprintItemStatus;
      requirementId?: string;
      rqsScore?: number;
      assigneeId?: string;
      assigneeName?: string;
    },
  ): Promise<SprintItem> {
    // Validate sprint exists if provided
    if (sprintId) {
      await this.findOne(sprintId, tenantId);
    }

    const item = this.sprintItemsRepository.create({
      ...data,
      sprintId: sprintId || undefined,
      tenantId,
      status:
        data.status ||
        (sprintId ? SprintItemStatus.TODO : SprintItemStatus.BACKLOG),
    });

    return this.sprintItemsRepository.save(item);
  }

  async getSprintItems(
    sprintId: string,
    tenantId: string,
  ): Promise<SprintItem[]> {
    await this.findOne(sprintId, tenantId);
    return this.sprintItemsRepository.find({
      where: { sprintId, tenantId },
      order: { createdAt: 'ASC' },
    });
  }

  async getBacklogItems(tenantId: string): Promise<SprintItem[]> {
    return this.sprintItemsRepository.find({
      where: {
        tenantId,
        sprintId: IsNull(), // Items not in any sprint
      },
      order: { priority: 'DESC', createdAt: 'DESC' },
    });
  }

  async getStructuredBacklog(tenantId: string): Promise<{
    requirements: any[];
    standaloneTasks: SprintItem[];
  }> {
    // 1. Get all backlog tasks (not in any sprint)
    const allBacklogTasks = await this.sprintItemsRepository.find({
      where: {
        tenantId,
        sprintId: IsNull(),
      },
      order: { priority: 'DESC', createdAt: 'DESC' },
      relations: ['requirement'], // We need requirement info to group them
    });

    // 2. Identify tasks that belong to a "Backlogged" requirement
    const tasksWithReqs = allBacklogTasks.filter(
      (item) =>
        item.requirement &&
        item.requirement.state === RequirementState.BACKLOGGED,
    );

    const standaloneTasks = allBacklogTasks.filter(
      (item) =>
        !item.requirement ||
        item.requirement.state !== RequirementState.BACKLOGGED,
    );

    // 3. Group tasks by requirement
    const reqMap = new Map<string, any>();

    for (const task of tasksWithReqs) {
      if (!task.requirement) continue;
      const reqId = task.requirement.id;

      if (!reqMap.has(reqId)) {
        // Initialize requirement group
        reqMap.set(reqId, {
          ...task.requirement,
          tasks: [],
        });
      }

      // Add task to its requirement
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const reqGroup = reqMap.get(reqId);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      reqGroup.tasks.push(task);
    }

    // 4. Return structured data
    return {
      requirements: Array.from(reqMap.values()),
      standaloneTasks,
    };
  }

  async updateItem(
    itemId: string,
    tenantId: string,
    data: Partial<SprintItem>,
  ): Promise<SprintItem> {
    const item = await this.sprintItemsRepository.findOne({
      where: { id: itemId, tenantId },
    });

    if (!item) {
      throw new NotFoundException(`Sprint item ${itemId} not found`);
    }

    Object.assign(item, data);
    return this.sprintItemsRepository.save(item);
  }

  async findOneItem(itemId: string, tenantId: string): Promise<SprintItem> {
    const item = await this.sprintItemsRepository.findOne({
      where: { id: itemId, tenantId },
      relations: ['sprint'],
    });

    if (!item) {
      throw new NotFoundException(`Sprint item ${itemId} not found`);
    }

    return item;
  }

  async moveItemToSprint(
    itemId: string,
    sprintId: string | null,
    tenantId: string,
    status?: SprintItemStatus,
  ): Promise<SprintItem> {
    const item = await this.sprintItemsRepository.findOne({
      where: { id: itemId, tenantId },
    });

    if (!item) {
      throw new NotFoundException(`Sprint item ${itemId} not found`);
    }

    // Validate sprint exists if moving to sprint
    if (sprintId) {
      await this.findOne(sprintId, tenantId);
    }

    item.sprintId = sprintId || undefined;
    item.status =
      status || (sprintId ? SprintItemStatus.TODO : SprintItemStatus.BACKLOG);

    return this.sprintItemsRepository.save(item);
  }

  async removeItem(itemId: string, tenantId: string): Promise<void> {
    const result = await this.sprintItemsRepository.delete({
      id: itemId,
      tenantId,
    });
    if (result.affected === 0) {
      throw new NotFoundException(`Sprint item ${itemId} not found`);
    }
  }

  // ===== Sprint Metrics =====

  async getSprintMetrics(sprintId: string, tenantId: string) {
    await this.findOne(sprintId, tenantId);

    const items = await this.sprintItemsRepository.find({
      where: { sprintId, tenantId },
    });

    const total = items.length;
    const done = items.filter((i) => i.status === SprintItemStatus.DONE).length;
    const inProgress = items.filter(
      (i) => i.status === SprintItemStatus.IN_PROGRESS,
    ).length;
    const todo = items.filter((i) => i.status === SprintItemStatus.TODO).length;
    const inTesting = items.filter(
      (i) => i.status === SprintItemStatus.IN_TESTING,
    ).length;
    const codeReview = items.filter(
      (i) => i.status === SprintItemStatus.CODE_REVIEW,
    ).length;
    const readyForQa = items.filter(
      (i) => i.status === SprintItemStatus.READY_FOR_QA,
    ).length;

    const byPriority = {
      critical: items.filter((i) => i.priority === SprintItemPriority.CRITICAL)
        .length,
      high: items.filter((i) => i.priority === SprintItemPriority.HIGH).length,
      medium: items.filter((i) => i.priority === SprintItemPriority.MEDIUM)
        .length,
      low: items.filter((i) => i.priority === SprintItemPriority.LOW).length,
    };

    const byType = {
      feature: items.filter((i) => i.type === SprintItemType.FEATURE).length,
      bug: items.filter((i) => i.type === SprintItemType.BUG).length,
      task: items.filter((i) => i.type === SprintItemType.TASK).length,
    };

    const avgRqsScore =
      items.filter((i) => i.rqsScore).length > 0
        ? items.reduce((sum, i) => sum + (i.rqsScore || 0), 0) /
          items.filter((i) => i.rqsScore).length
        : null;

    return {
      total,
      done,
      inProgress,
      todo,
      inTesting,
      codeReview,
      readyForQa,
      progress: total > 0 ? Math.round((done / total) * 100) : 0,
      byPriority,
      byType,
      avgRqsScore: avgRqsScore ? Math.round(avgRqsScore) : null,
    };
  }

  async getActiveSprint(tenantId: string): Promise<Sprint | null> {
    const sprint = await this.sprintsRepository.findOne({
      where: { tenantId, status: SprintStatus.ACTIVE },
      order: { startDate: 'DESC' },
    });
    return sprint;
  }

  // ===== AI Planning =====

  async planSprint(
    tenantId: string,
    capacity: number = 20,
  ): Promise<{
    recommendedItems: Array<{
      item: SprintItem;
      reason: string;
      score: number;
    }>;
    totalRecommended: number;
    capacityUtilized: number;
    reasoning: string;
  }> {
    // Get all backlog items
    const backlogItems = await this.getBacklogItems(tenantId);

    if (backlogItems.length === 0) {
      return {
        recommendedItems: [],
        totalRecommended: 0,
        capacityUtilized: 0,
        reasoning: 'No backlog items available for planning.',
      };
    }

    // Score each item based on priority and RQS
    const scoredItems = backlogItems.map((item) => {
      // Priority scoring: CRITICAL=40, HIGH=30, MEDIUM=20, LOW=10
      const priorityScore =
        {
          [SprintItemPriority.CRITICAL]: 40,
          [SprintItemPriority.HIGH]: 30,
          [SprintItemPriority.MEDIUM]: 20,
          [SprintItemPriority.LOW]: 10,
        }[item.priority] || 0;

      // RQS scoring: normalize 0-100 to 0-40 points
      const rqsScore = ((item.rqsScore || 0) / 100) * 40;

      // Type impact: Features are more valuable than tasks, tasks > bugs
      const typeScore =
        {
          [SprintItemType.FEATURE]: 20,
          [SprintItemType.TASK]: 15,
          [SprintItemType.BUG]: 10,
        }[item.type] || 0;

      // Total score out of 100
      const totalScore = priorityScore + rqsScore + typeScore;

      return {
        item,
        score: Math.round(totalScore),
        breakdown: { priorityScore, rqsScore, typeScore },
      };
    });

    // Sort by score descending
    scoredItems.sort((a, b) => b.score - a.score);

    // Select items up to capacity
    const recommendedItems = [];
    let currentCapacity = 0;

    for (const { item, score, breakdown } of scoredItems) {
      if (currentCapacity < capacity) {
        // Generate reasoning for this item
        const reasons = [];
        if (breakdown.priorityScore >= 30) {
          reasons.push(`Critical/High priority (${item.priority})`);
        }
        if (item.rqsScore && item.rqsScore >= 70) {
          reasons.push(`Strong requirement quality (RQS: ${item.rqsScore})`);
        }
        if (item.type === SprintItemType.FEATURE) {
          reasons.push('High-value feature');
        }
        if (item.priority === SprintItemPriority.CRITICAL) {
          reasons.push('Blocks release');
        }

        recommendedItems.push({
          item,
          reason: reasons.join('; '),
          score,
        });

        currentCapacity++;
      }
    }

    // Generate overall reasoning
    const reasoning = this.generatePlanningReasoning(
      backlogItems.length,
      recommendedItems.length,
      capacity,
    );

    return {
      recommendedItems,
      totalRecommended: recommendedItems.length,
      capacityUtilized: recommendedItems.length,
      reasoning,
    };
  }

  private generatePlanningReasoning(
    totalBacklog: number,
    recommended: number,
    capacity: number,
  ): string {
    const utilizationRate = Math.round((recommended / capacity) * 100);
    const remainingBacklog = totalBacklog - recommended;

    return (
      `AI selected ${recommended} items for your sprint (${utilizationRate}% capacity utilization). ` +
      `${remainingBacklog} items remain in backlog. ` +
      `Selection prioritizes: Critical/High priority items, high RQS requirements, and valuable features. `
    );
  }

  // ===== Option C: Velocity Tracking & Burndown Analytics =====

  async calculateVelocity(sprintId: string, tenantId: string): Promise<number> {
    const sprint = await this.findOne(sprintId, tenantId);

    // Count completed items as velocity
    const items = await this.sprintItemsRepository.find({
      where: { sprintId, tenantId, status: SprintItemStatus.DONE },
    });

    const velocity = items.length;

    // Update sprint velocity
    sprint.velocity = velocity;
    await this.sprintsRepository.save(sprint);

    return velocity;
  }

  async getVelocityTrend(
    tenantId: string,
    limit: number = 5,
  ): Promise<{
    sprints: Array<{
      sprintId: string;
      name: string;
      velocity: number;
      capacity: number;
      endDate: Date | null;
    }>;
    averageVelocity: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  }> {
    const completedSprints = await this.sprintsRepository.find({
      where: { tenantId, status: SprintStatus.COMPLETED },
      order: { endDate: 'DESC' },
      take: limit,
    });

    const sprintData = completedSprints.map((sprint) => ({
      sprintId: sprint.id,
      name: sprint.name,
      velocity: sprint.velocity || 0,
      capacity: sprint.capacity,
      endDate: sprint.endDate || null,
    }));

    const avgVelocity =
      sprintData.length > 0
        ? Math.round(
            sprintData.reduce((sum, s) => sum + s.velocity, 0) /
              sprintData.length,
          )
        : 0;

    // Determine trend
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (sprintData.length >= 2) {
      const recent = sprintData.slice(0, 2);
      if (recent[0].velocity > recent[1].velocity) trend = 'increasing';
      else if (recent[0].velocity < recent[1].velocity) trend = 'decreasing';
    }

    return {
      sprints: sprintData,
      averageVelocity: avgVelocity,
      trend,
    };
  }

  async getBurndownData(
    sprintId: string,
    tenantId: string,
  ): Promise<{
    totalItems: number;
    completedItems: number;
    remainingItems: number;
    dailyBurndown: Array<{
      date: string;
      remaining: number;
      ideal: number;
    }>;
    projectedCompletion: string | null;
  }> {
    const sprint = await this.findOne(sprintId, tenantId);
    const items = await this.sprintItemsRepository.find({
      where: { sprintId, tenantId },
    });

    const total = items.length;
    const completed = items.filter(
      (i) => i.status === SprintItemStatus.DONE,
    ).length;
    const remaining = total - completed;

    // Generate ideal burndown line
    const dailyBurndown = [];
    if (sprint.startDate && sprint.endDate) {
      const start = new Date(sprint.startDate);
      const end = new Date(sprint.endDate);
      const totalDays = Math.ceil(
        (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
      );
      const now = new Date();
      const daysPassed = Math.max(
        0,
        Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)),
      );

      for (let day = 0; day <= Math.min(daysPassed, totalDays); day++) {
        const date = new Date(start);
        date.setDate(date.getDate() + day);

        const idealRemaining = Math.max(0, total - (total * day) / totalDays);
        const actualRemaining = day === daysPassed ? remaining : idealRemaining; // Simplified

        dailyBurndown.push({
          date: date.toISOString().split('T')[0],
          remaining: Math.round(actualRemaining),
          ideal: Math.round(idealRemaining),
        });
      }
    }

    // Project completion date based on current velocity
    let projectedCompletion: string | null = null;
    if (sprint.startDate && sprint.endDate && remaining > 0) {
      const velocity = sprint.velocity || completed;
      if (velocity > 0) {
        const now = new Date();
        const start = new Date(sprint.startDate);
        const daysPassed = Math.max(
          1,
          Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)),
        );
        const dailyVelocity = completed / daysPassed;
        const daysNeeded = Math.ceil(remaining / dailyVelocity);
        const projectedDate = new Date(now);
        projectedDate.setDate(projectedDate.getDate() + daysNeeded);
        projectedCompletion = projectedDate.toISOString().split('T')[0];
      }
    }

    return {
      totalItems: total,
      completedItems: completed,
      remainingItems: remaining,
      dailyBurndown,
      projectedCompletion,
    };
  }

  // ===== Option D: Auto-create Sprint Items from Requirements =====

  async createItemsFromRequirements(
    requirementIds: string[],
    sprintId: string | null,
    tenantId: string,
  ): Promise<SprintItem[]> {
    // Note: This requires RequirementsService injection to fetch requirements
    // For now, we'll create a simplified version that accepts requirement data
    const createdItems: SprintItem[] = [];

    for (const reqId of requirementIds) {
      // In production, fetch the requirement details from RequirementsService
      // For now, create placeholder items
      const item = await this.addItem(sprintId, tenantId, {
        title: `Implement Requirement ${reqId}`,
        description: `Auto-generated from requirement ${reqId}`,
        type: SprintItemType.FEATURE,
        priority: SprintItemPriority.MEDIUM,
        requirementId: reqId,
        status: sprintId ? SprintItemStatus.TODO : SprintItemStatus.BACKLOG,
      });
      createdItems.push(item);
    }

    return createdItems;
  }

  generateTaskBreakdown(
    requirementId: string,
    requirementTitle: string,
    requirementDescription: string,
  ): Promise<{
    suggestedTasks: Array<{
      title: string;
      description: string;
      type: SprintItemType;
      estimatedHours: number;
    }>;
    totalEstimate: number;
  }> {
    // AI-powered task breakdown
    // For MVP, use rule-based breakdown
    const tasks = [
      {
        title: `Design: ${requirementTitle}`,
        description: `Create technical design for: ${requirementDescription?.substring(0, 100)}...`,
        type: SprintItemType.TASK,
        estimatedHours: 4,
      },
      {
        title: `Implement: ${requirementTitle}`,
        description: `Core implementation of: ${requirementDescription?.substring(0, 100)}...`,
        type: SprintItemType.FEATURE,
        estimatedHours: 16,
      },
      {
        title: `Test: ${requirementTitle}`,
        description: `Write and execute tests for: ${requirementDescription?.substring(0, 100)}...`,
        type: SprintItemType.TASK,
        estimatedHours: 8,
      },
    ];

    const totalEstimate = tasks.reduce((sum, t) => sum + t.estimatedHours, 0);

    return Promise.resolve({
      suggestedTasks: tasks,
      totalEstimate,
    });
  }

  /**
   * Reconstruct Sprint aggregate from entity
   * Used to apply domain logic to existing sprints
   * Bridges between persistent entity and domain model
   *
   * @private
   */
  private reconstructAggregate(entity: Sprint): SprintAggregate {
    // Create aggregate instance directly
    const capacity = new SprintCapacity(entity.capacity);
    const status = (entity.status as any) || 'PLANNED';

    const aggregate = new SprintAggregate(
      entity.id,
      entity.tenantId,
      entity.name,
      capacity,
      entity.startDate || new Date(),
      entity.endDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      status,
      entity.goal,
    );
    aggregate.createdAt = entity.createdAt;
    aggregate.updatedAt = entity.updatedAt;

    // Populate items if available
    if (entity.sprintItems && Array.isArray(entity.sprintItems)) {
      aggregate.items = entity.sprintItems;
    }

    return aggregate;
  }
}
