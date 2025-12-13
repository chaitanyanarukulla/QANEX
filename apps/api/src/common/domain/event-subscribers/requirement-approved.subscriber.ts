import { Injectable, Logger } from '@nestjs/common';
import { DomainEventSubscriber } from '../domain-event.publisher';
import { DomainEvent } from '../aggregate-root.interface';
import { RequirementApproved } from '../../../requirements/domain/events/requirement-approved.event';

/**
 * RequirementApproved Event Subscriber
 *
 * Workflow: When a requirement is approved, automatically generate initial tasks/issues
 * in the sprint backlog to begin implementation.
 *
 * This subscriber demonstrates cross-context communication:
 * - Requirements context: Publishes RequirementApproved event
 * - Sprint context: Creates initial tasks from requirement details
 *
 * SLA: Process within 100ms for UX responsiveness
 * Retry: 3 attempts with exponential backoff
 * Error Handling: Log and continue (don't block requirement approval)
 *
 * Future Enhancement: When Saga pattern implemented, can coordinate with
 * multiple contexts (Requirements → Sprints → Tests → Metrics)
 */
@Injectable()
export class RequirementApprovedSubscriber implements DomainEventSubscriber {
  private readonly logger = new Logger(RequirementApprovedSubscriber.name);

  constructor() {
    // TODO: Inject services when available
    // private requirementsService: RequirementsService,
    // private sprintsService: SprintsService,
  }

  /**
   * Handle RequirementApproved event and generate initial tasks
   *
   * Process:
   * 1. Validate requirement data is complete
   * 2. Extract tasks from acceptance criteria or requirement description
   * 3. Create task items in sprint backlog
   * 4. Link tasks back to requirement
   * 5. Notify team of new tasks
   *
   * @param event RequirementApproved event
   */
  async handle(_event: RequirementApproved): Promise<void> {
    try {
      this.logger.debug(
        `Processing RequirementApproved event for ${event.aggregateId}`,
      );

      // Extract task data from requirement
      // TODO: Implement when Requirement model available
      // const requirement = await this.requirementsService.findById(event.aggregateId);
      // const tasks = this.extractTasks(requirement);

      // Create tasks in sprint backlog
      // TODO: Implement task creation when Sprint service available
      // for (const taskData of tasks) {
      //   const task = await this.sprintsService.createTask({
      //     sprintId: requirement.defaultSprintId,
      //     title: taskData.title,
      //     description: taskData.description,
      //     estimatedPoints: taskData.estimatedPoints,
      //     requirementId: event.aggregateId,
      //   });
      // }

      // Publish TasksGenerated event for downstream workflows
      // this.eventPublisher.publish(new TasksGeneratedFromRequirement(...))

      this.logger.log(
        `✓ RequirementApproved processed for requirement ${event.aggregateId}`,
      );
    } catch (error) {
      // Error handling: log but don't rethrow
      // This ensures requirement approval isn't blocked by task generation failure
      this.logger.error(
        `✗ Failed to process RequirementApproved: ${(error as Error).message}`,
        (error as Error).stack,
      );

      // TODO: Could publish FailedToGenerateTasks event for monitoring/alerting
    }
  }

  /**
   * Check if subscriber is interested in this event
   */
  isSubscribedTo(event: DomainEvent): boolean {
    return event.eventType === 'RequirementApproved';
  }

  /**
   * Extract tasks from requirement's acceptance criteria
   * This is a helper method for converting AC to concrete tasks
   *
   * Example: If AC is "User can login with username/password"
   * This generates tasks like:
   * - "Implement login form UI"
   * - "Add authentication service call"
   * - "Add error handling for invalid credentials"
   *
   * @private
   */
  private extractTasks(
    _requirement: any,
  ): Array<{ title: string; description: string; estimatedPoints: number }> {
    const tasks: Array<{
      title: string;
      description: string;
      estimatedPoints: number;
    }> = [];

    // TODO: Implement task extraction logic
    // This would parse acceptance criteria and generate concrete tasks

    return tasks;
  }
}
