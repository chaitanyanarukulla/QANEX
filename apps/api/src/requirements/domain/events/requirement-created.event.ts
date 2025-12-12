import { DomainEvent } from '../../../common/domain/aggregate-root.interface';

/**
 * RequirementCreated Domain Event
 *
 * Published when a new requirement is created in the system.
 *
 * Triggered by:
 * - User creating a new requirement through UI/API
 * - Document processing system automatically generating requirements from uploaded documents
 *
 * Subscribers should handle:
 * - RAG indexing for semantic search
 * - Audit trail recording
 * - Initial RQS analysis triggering
 * - Requirement lifecycle notifications
 *
 * Example:
 * ```typescript
 * const event: RequirementCreated = {
 *   eventId: '...',
 *   eventType: 'RequirementCreated',
 *   aggregateId: 'req-123',
 *   aggregateType: 'Requirement',
 *   tenantId: 'tenant-1',
 *   userId: 'user-1',
 *   occurredAt: new Date(),
 *   requirementId: 'req-123',
 *   title: 'User Authentication System',
 *   priority: 'HIGH',
 *   sourceDocumentId: 'doc-456' // if created from document
 * };
 * ```
 */
export class RequirementCreated implements DomainEvent {
  readonly eventId: string;
  readonly eventType = 'RequirementCreated';
  readonly aggregateType = 'Requirement';
  readonly aggregateId: string;
  readonly tenantId: string;
  readonly userId?: string;
  readonly occurredAt: Date;

  // Requirement-specific event data
  readonly requirementId: string;
  readonly title: string;
  readonly priority?: string;
  readonly type?: string;
  readonly sourceDocumentId?: string;

  constructor(
    aggregateId: string,
    tenantId: string,
    requirementId: string,
    title: string,
    options?: {
      eventId?: string;
      userId?: string;
      priority?: string;
      type?: string;
      sourceDocumentId?: string;
      occurredAt?: Date;
    },
  ) {
    this.aggregateId = aggregateId;
    this.tenantId = tenantId;
    this.requirementId = requirementId;
    this.title = title;
    this.userId = options?.userId;
    this.priority = options?.priority;
    this.type = options?.type;
    this.sourceDocumentId = options?.sourceDocumentId;
    this.occurredAt = options?.occurredAt ?? new Date();
    this.eventId =
      options?.eventId ?? `RequirementCreated-${requirementId}-${Date.now()}`;
  }
}
