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
  eventId: string;
  eventType: string = 'RequirementApproved';
  aggregateId: string;
  aggregateType: string = 'Requirement';
  tenantId: string;
  occurredAt: Date;
  approverId: string;
  approverRole: string;

  constructor(props: {
    eventId: string;
    eventType: string;
    aggregateId: string;
    aggregateType: string;
    tenantId: string;
    occurredAt: Date;
    approverId: string;
    approverRole: string;
  }) {
    this.eventId = props.eventId;
    this.eventType = props.eventType;
    this.aggregateId = props.aggregateId;
    this.aggregateType = props.aggregateType;
    this.tenantId = props.tenantId;
    this.occurredAt = props.occurredAt;
    this.approverId = props.approverId;
    this.approverRole = props.approverRole;
  }
}
