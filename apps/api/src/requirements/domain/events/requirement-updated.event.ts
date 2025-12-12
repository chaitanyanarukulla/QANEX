import { DomainEvent } from '../../../common/domain/aggregate-root.interface';

/**
 * RequirementUpdated Domain Event
 *
 * Published when requirement properties are updated.
 */
export class RequirementUpdated implements DomainEvent {
  eventId: string;
  eventType: string = 'RequirementUpdated';
  aggregateId: string;
  aggregateType: string = 'Requirement';
  tenantId: string;
  occurredAt: Date;
  changes: Record<string, any>;

  constructor(props: {
    eventId: string;
    eventType: string;
    aggregateId: string;
    aggregateType: string;
    tenantId: string;
    occurredAt: Date;
    changes: Record<string, any>;
  }) {
    this.eventId = props.eventId;
    this.eventType = props.eventType;
    this.aggregateId = props.aggregateId;
    this.aggregateType = props.aggregateType;
    this.tenantId = props.tenantId;
    this.occurredAt = props.occurredAt;
    this.changes = props.changes;
  }
}
