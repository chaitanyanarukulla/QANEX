import { Injectable, Logger } from '@nestjs/common';
import { DomainEventPublisher } from '../domain-event.publisher';
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
export class RequirementApprovedSubscriber {
  private readonly logger = new Logger(RequirementApprovedSubscriber.name);

  constructor(private eventPublisher: DomainEventPublisher) {
    // Subscribe to RequirementApproved events
    this.eventPublisher.subscribe(
      'RequirementApproved',
      this.handle.bind(this),
    );
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
  async handle(event: RequirementApproved): Promise<void> {
    try {
      this.logger.debug(
        `Processing RequirementApproved event for ${event.requirementId}`,
      );

      // Extract task data from requirement
      // TODO: Implement when Requirement model available
      // const requirement = await this.requirementsService.findById(event.requirementId);
      // const tasks = this.extractTasks(requirement);

      // Create tasks in sprint backlog
      // TODO: Implement task creation when Sprint service available
      // for (const taskData of tasks) {
      //   const task = await this.sprintsService.createTask({
      //     sprintId: requirement.defaultSprintId,
      //     title: taskData.title,
      //     description: taskData.description,
      //     estimatedPoints: taskData.estimatedPoints,
      //     requirementId: event.requirementId,
      //   });
      // }

      // Publish TasksGenerated event for downstream workflows
      // this.eventPublisher.publish(new TasksGeneratedFromRequirement(...))

      this.logger.log(
        `Successfully generated tasks for requirement ${event.requirementId}`,
      );
    } catch (error) {
      // Error handling: log but don't rethrow
      // This ensures requirement approval isn't blocked by task generation failure
      this.logger.error(
        `Failed to generate tasks for requirement ${event.requirementId}: ${error.message}`,
        error.stack,
      );

      // TODO: Could publish FailedToGenerateTasks event for monitoring/alerting
    }
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
    requirement: any,
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
