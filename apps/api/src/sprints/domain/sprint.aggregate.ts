import {
  BaseDomainAggregate,
  DomainEvent,
} from '../../common/domain/aggregate-root.interface';
import { SprintCreated } from './events/sprint-created.event';
import { SprintStarted } from './events/sprint-started.event';
import { SprintCompleted } from './events/sprint-completed.event';
import { ItemAddedToSprint } from './events/item-added-to-sprint.event';
import { SprintCapacity } from './value-objects/sprint-capacity.vo';
import { SprintStatus } from './value-objects/sprint-status.vo';

/**
 * Sprint Aggregate Root
 *
 * Represents a time-boxed iteration in the development cycle.
 * Encapsulates business logic for sprint management and capacity planning.
 *
 * Invariants (Domain Rules):
 * 1. A sprint can only transition: PLANNED → ACTIVE → COMPLETED
 * 2. Items can only be added to a PLANNED sprint
 * 3. Sprint capacity cannot be exceeded when adding items
 * 4. Sprint must have at least one item before starting
 * 5. Cannot have two ACTIVE sprints for same tenant
 * 6. Sprint dates must be: startDate < endDate
 *
 * Domain Events Published:
 * - SprintCreated: New sprint initialized
 * - ItemAddedToSprint: Item added to sprint
 * - SprintStarted: Sprint moved to ACTIVE status
 * - SprintCompleted: Sprint finished with metrics
 *
 * Example:
 * ```typescript
 * const sprint = Sprint.create({
 *   name: 'Sprint 1',
 *   capacity: new SprintCapacity(40),
 *   startDate: new Date(),
 *   endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
 *   tenantId: 'tenant-1',
 *   userId: 'user-1'
 * });
 *
 * sprint.addItem({
 *   title: 'Implement auth',
 *   storyPoints: 8
 * });
 *
 * sprint.start();
 *
 * // Save and publish events
 * await repo.save(sprint);
 * await eventPublisher.publishAll(sprint.getDomainEvents());
 * ```
 */
export class Sprint extends BaseDomainAggregate {
  public id: string;
  public tenantId: string;
  public name: string;
  public description?: string;
  public status: SprintStatus;
  public capacity: SprintCapacity;
  public startDate: Date;
  public endDate: Date;
  public items: SprintItem[] = [];
  public createdAt: Date;
  public updatedAt: Date;

  constructor(
    id: string,
    tenantId: string,
    name: string,
    capacity: SprintCapacity,
    startDate: Date,
    endDate: Date,
    status: SprintStatus = SprintStatus.PLANNED,
    description?: string,
  ) {
    super();
    this.id = id;
    this.tenantId = tenantId;
    this.name = name;
    this.description = description;
    this.capacity = capacity;
    this.startDate = startDate;
    this.endDate = endDate;
    this.status = status;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Factory method to create a new sprint.
   * Publishes SprintCreated event.
   *
   * @throws Error if dates are invalid (startDate >= endDate)
   */
  public static create(params: {
    id: string;
    tenantId: string;
    name: string;
    capacity: number; // story points
    startDate: Date;
    endDate: Date;
    description?: string;
    userId?: string;
  }): Sprint {
    // Validate dates
    if (params.startDate >= params.endDate) {
      throw new Error('Invalid sprint dates: startDate must be before endDate');
    }

    // Validate capacity
    const capacity = new SprintCapacity(params.capacity);

    // Create aggregate
    const sprint = new Sprint(
      params.id,
      params.tenantId,
      params.name,
      capacity,
      params.startDate,
      params.endDate,
      SprintStatus.PLANNED,
      params.description,
    );

    // Publish domain event
    sprint.addDomainEvent(
      new SprintCreated(
        sprint.id,
        sprint.tenantId,
        sprint.name,
        params.capacity,
        {
          userId: params.userId,
          description: params.description,
        },
      ),
    );

    return sprint;
  }

  /**
   * Add an item (task/story) to the sprint.
   *
   * Domain Rules:
   * - Can only add items to PLANNED sprints
   * - Total story points cannot exceed capacity
   * - Item must have title and valid story points
   *
   * @throws InvalidSprintStateError if sprint is not PLANNED
   * @throws CapacityExceededError if adding item exceeds capacity
   * @throws ValidationError if item data is invalid
   */
  public addItem(
    item: {
      id: string;
      title: string;
      storyPoints: number;
      priority?: string;
      type?: string;
    },
    userId?: string,
  ): void {
    // Check sprint state
    if (this.status !== SprintStatus.PLANNED) {
      throw new Error(
        `Cannot add items to ${this.status} sprint. Only PLANNED sprints accept items.`,
      );
    }

    // Check capacity
    const currentPoints = this.getTotalStoryPoints();
    if (currentPoints + item.storyPoints > this.capacity.getValue()) {
      throw new Error(
        `Adding ${item.storyPoints} story points exceeds sprint capacity. ` +
          `Current: ${currentPoints}/${this.capacity.getValue()}`,
      );
    }

    // Validate item
    if (!item.title || item.title.trim().length === 0) {
      throw new Error('Item title cannot be empty');
    }

    if (item.storyPoints < 0) {
      throw new Error('Story points cannot be negative');
    }

    // Add item to sprint
    const sprintItem: SprintItem = {
      id: item.id,
      sprintId: this.id,
      title: item.title,
      storyPoints: item.storyPoints,
      status: 'TODO',
      priority: item.priority || 'MEDIUM',
      type: item.type || 'TASK',
    };

    this.items.push(sprintItem);
    this.updatedAt = new Date();

    // Publish event
    this.addDomainEvent(
      new ItemAddedToSprint(this.id, this.tenantId, item.id, item.title, {
        userId,
        storyPoints: item.storyPoints,
      }),
    );
  }

  /**
   * Remove an item from the sprint.
   *
   * Domain Rules:
   * - Can only remove items from PLANNED sprints
   *
   * @throws InvalidSprintStateError if sprint is not PLANNED
   * @throws ItemNotFoundError if item doesn't exist
   */
  public removeItem(itemId: string): void {
    if (this.status !== SprintStatus.PLANNED) {
      throw new Error(`Cannot remove items from ${this.status} sprint`);
    }

    const initialLength = this.items.length;
    this.items = this.items.filter((item) => item.id !== itemId);

    if (this.items.length === initialLength) {
      throw new Error(`Item ${itemId} not found in sprint`);
    }

    this.updatedAt = new Date();
  }

  /**
   * Start the sprint (transition to ACTIVE status).
   *
   * Domain Rules:
   * - Sprint must be in PLANNED status
   * - Sprint must have at least one item
   * - Sprint cannot have zero capacity
   *
   * @throws InvalidSprintStateError if not PLANNED
   * @throws EmptySprintError if no items
   */
  public start(userId?: string): void {
    // Check current status
    if (this.status !== SprintStatus.PLANNED) {
      throw new Error(
        `Cannot start ${this.status} sprint. Only PLANNED sprints can be started.`,
      );
    }

    // Check items
    if (this.items.length === 0) {
      throw new Error('Cannot start sprint with zero items');
    }

    // Update status
    this.status = SprintStatus.ACTIVE;
    this.updatedAt = new Date();

    // Publish event
    this.addDomainEvent(
      new SprintStarted(this.id, this.tenantId, {
        userId,
        itemCount: this.items.length,
        totalStoryPoints: this.getTotalStoryPoints(),
      }),
    );
  }

  /**
   * Complete the sprint (transition to COMPLETED status).
   *
   * Domain Rules:
   * - Sprint must be in ACTIVE status
   * - Collects sprint metrics (velocity, completion percentage)
   *
   * @throws InvalidSprintStateError if not ACTIVE
   */
  public complete(
    metrics: {
      completedItems: number;
      completedStoryPoints: number;
      velocity?: number;
    },
    userId?: string,
  ): void {
    if (this.status !== SprintStatus.ACTIVE) {
      throw new Error(
        `Cannot complete ${this.status} sprint. Only ACTIVE sprints can be completed.`,
      );
    }

    const totalPoints = this.getTotalStoryPoints();
    const completionPercentage =
      totalPoints > 0
        ? Math.round((metrics.completedStoryPoints / totalPoints) * 100)
        : 0;

    this.status = SprintStatus.COMPLETED;
    this.updatedAt = new Date();

    // Publish event with metrics
    this.addDomainEvent(
      new SprintCompleted(this.id, this.tenantId, {
        userId,
        totalItems: this.items.length,
        completedItems: metrics.completedItems,
        totalStoryPoints: totalPoints,
        completedStoryPoints: metrics.completedStoryPoints,
        completionPercentage,
        velocity: metrics.velocity,
      }),
    );
  }

  /**
   * Get total story points for all items in sprint.
   */
  public getTotalStoryPoints(): number {
    return this.items.reduce((sum, item) => sum + item.storyPoints, 0);
  }

  /**
   * Get remaining capacity (unused story points).
   */
  public getRemainingCapacity(): number {
    return this.capacity.getValue() - this.getTotalStoryPoints();
  }

  /**
   * Check if sprint can accommodate additional story points.
   */
  public canAddStoryPoints(points: number): boolean {
    return this.getTotalStoryPoints() + points <= this.capacity.getValue();
  }

  /**
   * Get sprint capacity percentage used.
   */
  public getCapacityUsagePercentage(): number {
    const totalPoints = this.getTotalStoryPoints();
    const capacity = this.capacity.getValue();
    return capacity > 0 ? Math.round((totalPoints / capacity) * 100) : 0;
  }

  /**
   * Check if sprint is full (100% capacity).
   */
  public isFull(): boolean {
    return this.getTotalStoryPoints() >= this.capacity.getValue();
  }

  /**
   * Get sprint duration in days.
   */
  public getDurationInDays(): number {
    const diff = this.endDate.getTime() - this.startDate.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  /**
   * Check if sprint is ongoing (current date between start and end).
   */
  public isOngoing(): boolean {
    const now = new Date();
    return now >= this.startDate && now <= this.endDate;
  }

  /**
   * Get human-readable summary of sprint.
   */
  public getSummary(): string {
    return (
      `Sprint: ${this.name} (${this.status}) - ` +
      `${this.getTotalStoryPoints()} / ${this.capacity.getValue()} points - ` +
      `${this.items.length} items`
    );
  }
}

/**
 * SprintItem Entity (Child Entity of Sprint Aggregate)
 *
 * Represents a single task/story/bug within a sprint.
 * Part of Sprint aggregate, not an independent entity.
 */
export interface SprintItem {
  id: string;
  sprintId: string;
  title: string;
  storyPoints: number;
  status: string; // TODO, IN_PROGRESS, DONE, BLOCKED
  priority: string; // CRITICAL, HIGH, MEDIUM, LOW
  type: string; // FEATURE, BUG, TASK
  requirementId?: string;
  assigneeId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
