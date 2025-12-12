import { DomainEvent } from '../../../common/domain/aggregate-root.interface';

/**
 * RequirementAnalyzed Domain Event
 *
 * Published when a requirement is analyzed and RQS score is calculated.
 */
export class RequirementAnalyzed implements DomainEvent {
  eventId: string;
  eventType: string = 'RequirementAnalyzed';
  aggregateId: string;
  aggregateType: string = 'Requirement';
  tenantId: string;
  occurredAt: Date;
  score: number;
  clarity: number;
  completeness: number;
  testability: number;
  consistency: number;
  feedback: string[];

  constructor(props: {
    eventId: string;
    eventType: string;
    aggregateId: string;
    aggregateType: string;
    tenantId: string;
    occurredAt: Date;
    score: number;
    clarity: number;
    completeness: number;
    testability: number;
    consistency: number;
    feedback: string[];
  }) {
    this.eventId = props.eventId;
    this.eventType = props.eventType;
    this.aggregateId = props.aggregateId;
    this.aggregateType = props.aggregateType;
    this.tenantId = props.tenantId;
    this.occurredAt = props.occurredAt;
    this.score = props.score;
    this.clarity = props.clarity;
    this.completeness = props.completeness;
    this.testability = props.testability;
    this.consistency = props.consistency;
    this.feedback = props.feedback;
  }
}
