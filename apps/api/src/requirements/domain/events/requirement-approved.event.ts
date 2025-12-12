import { DomainEvent } from '../../../common/domain/aggregate-root.interface';

/**
 * RequirementApproved Domain Event
 *
 * Published when a requirement is moved to APPROVED state.
 *
 * This is a critical event that signals:
 * - The requirement has passed quality gates and review
 * - The requirement is ready for planning and implementation
 * - Dependent systems can now act on this requirement
 *
 * Triggered by:
 * - Product Manager/Stakeholder approving a requirement
 * - Automatic approval based on RQS score threshold (if configured)
 *
 * Subscribers should handle:
 * - Trigger automatic task generation
 * - Send notifications to team members
 * - Update project roadmap
 * - Make requirement available for sprint planning
 * - Publish to downstream systems
 *
 * Example:
 * ```typescript
 * const event: RequirementApproved = {
 *   eventId: '...',
 *   eventType: 'RequirementApproved',
 *   aggregateId: 'req-123',
 *   aggregateType: 'Requirement',
 *   tenantId: 'tenant-1',
 *   userId: 'user-1', // who approved it
 *   occurredAt: new Date(),
 *   requirementId: 'req-123',
 *   previousState: 'DRAFT',
 *   rqsScore: 85 // if RQS assessment was done
 * };
 * ```
 */
export class RequirementApproved implements DomainEvent {
  readonly eventId: string;
  readonly eventType = 'RequirementApproved';
  readonly aggregateType = 'Requirement';
  readonly aggregateId: string;
  readonly tenantId: string;
  readonly userId?: string;
  readonly occurredAt: Date;

  // Requirement-specific event data
  readonly requirementId: string;
  readonly previousState: string;
  readonly rqsScore?: number;

  constructor(
    aggregateId: string,
    tenantId: string,
    requirementId: string,
    previousState: string,
    options?: {
      eventId?: string;
      userId?: string;
      rqsScore?: number;
      occurredAt?: Date;
    },
  ) {
    this.aggregateId = aggregateId;
    this.tenantId = tenantId;
    this.requirementId = requirementId;
    this.previousState = previousState;
    this.userId = options?.userId;
    this.rqsScore = options?.rqsScore;
    this.occurredAt = options?.occurredAt ?? new Date();
    this.eventId =
      options?.eventId ??
      `RequirementApproved-${requirementId}-${Date.now()}`;
  }
}
