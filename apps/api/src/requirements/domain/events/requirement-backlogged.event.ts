import { DomainEvent } from '../../../common/domain/aggregate-root.interface';

/**
 * RequirementBacklogged Domain Event
 *
 * Published when a requirement is moved to BACKLOGGED state.
 */
export class RequirementBacklogged implements DomainEvent {
  eventId: string;
  eventType: string = 'RequirementBacklogged';
  aggregateId: string;
  aggregateType: string = 'Requirement';
  tenantId: string;
  occurredAt: Date;

  constructor(props: {
    eventId: string;
    eventType: string;
    aggregateId: string;
    aggregateType: string;
    tenantId: string;
    occurredAt: Date;
  }) {
    this.eventId = props.eventId;
    this.eventType = props.eventType;
    this.aggregateId = props.aggregateId;
    this.aggregateType = props.aggregateType;
    this.tenantId = props.tenantId;
    this.occurredAt = props.occurredAt;
  }
}
