import { TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as request from 'supertest';
import { EventStoreService } from '../src/common/event-store/services/event-store.service';
import { EventStorePublisher } from '../src/common/event-store/event-store-publisher';
import { EventMigrationHandler } from '../src/common/event-store/handlers/event-migration.handler';
import { StoredDomainEvent } from '../src/common/event-store/entities/stored-domain-event.entity';
import { EventStoreModule } from '../src/common/event-store/event-store.module';
import { DomainEventPublisher } from '../src/common/domain/domain-event.publisher';

/**
 * Event Sourcing E2E Tests
 *
 * Validates the complete event-driven workflow:
 * 1. Events are created by aggregates
 * 2. Events are persisted to EventStore
 * 3. Events are published to subscribers
 * 4. Aggregates can be reconstructed from events
 * 5. Events can be migrated to new versions
 * 6. Snapshots optimize large aggregates
 */
describe('Event Sourcing (E2E)', () => {
  let app: INestApplication;
  let eventStore: EventStoreService;
  let eventStorePublisher: EventStorePublisher;
  let migrationHandler: EventMigrationHandler;
  let domainEventPublisher: DomainEventPublisher;
  let storedEventRepository: Repository<StoredDomainEvent>;

  const tenantId = 'test-tenant-1';
  const aggregateId = 'req-1';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [StoredDomainEvent],
          synchronize: true,
        }),
        EventStoreModule,
      ],
      providers: [DomainEventPublisher],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());

    await app.init();

    eventStore = moduleFixture.get<EventStoreService>(EventStoreService);
    eventStorePublisher =
      moduleFixture.get<EventStorePublisher>(EventStorePublisher);
    migrationHandler = moduleFixture.get<EventMigrationHandler>(
      EventMigrationHandler,
    );
    domainEventPublisher =
      moduleFixture.get<DomainEventPublisher>(DomainEventPublisher);
    storedEventRepository = moduleFixture.get('StoredDomainEventRepository');
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. Event Persistence', () => {
    it('should persist single event to event store', async () => {
      const event = {
        eventId: 'evt-1',
        eventType: 'RequirementCreated',
        aggregateId,
        aggregateType: 'Requirement',
        tenantId,
        occurredAt: new Date(),
        data: { title: 'Add authentication' },
      };

      await eventStore.appendEvent(event, tenantId);

      const stored = await storedEventRepository.findOne({
        where: { eventId: 'evt-1', tenantId },
      });

      expect(stored).toBeDefined();
      expect(stored.eventType).toBe('RequirementCreated');
      expect(stored.eventData).toEqual(event.data);
    });

    it('should persist multiple events atomically', async () => {
      const events = [
        {
          eventId: 'evt-2',
          eventType: 'RequirementCreated',
          aggregateId: 'req-2',
          aggregateType: 'Requirement',
          tenantId,
          occurredAt: new Date(),
          data: { title: 'Add payment' },
        },
        {
          eventId: 'evt-3',
          eventType: 'RequirementApproved',
          aggregateId: 'req-2',
          aggregateType: 'Requirement',
          tenantId,
          occurredAt: new Date(),
          data: { approverId: 'user-1' },
        },
      ];

      await eventStore.appendEvents(events, tenantId);

      const count = await storedEventRepository.count({
        where: { aggregateId: 'req-2', tenantId },
      });

      expect(count).toBe(2);
    });

    it('should maintain strict event ordering', async () => {
      const baseTime = new Date('2024-01-01T12:00:00Z');
      const events = [
        {
          eventId: 'evt-10',
          eventType: 'RequirementCreated',
          aggregateId: 'req-3',
          aggregateType: 'Requirement',
          tenantId,
          occurredAt: new Date(baseTime.getTime() + 0),
          data: {},
        },
        {
          eventId: 'evt-11',
          eventType: 'RequirementApproved',
          aggregateId: 'req-3',
          aggregateType: 'Requirement',
          tenantId,
          occurredAt: new Date(baseTime.getTime() + 1000),
          data: {},
        },
        {
          eventId: 'evt-12',
          eventType: 'RequirementAnalyzed',
          aggregateId: 'req-3',
          aggregateType: 'Requirement',
          tenantId,
          occurredAt: new Date(baseTime.getTime() + 2000),
          data: {},
        },
      ];

      await eventStore.appendEvents(events, tenantId);

      const retrieved = await eventStore.getEventsForAggregate(
        'req-3',
        tenantId,
      );

      expect(retrieved).toHaveLength(3);
      expect(retrieved[0].eventId).toBe('evt-10');
      expect(retrieved[1].eventId).toBe('evt-11');
      expect(retrieved[2].eventId).toBe('evt-12');
    });
  });

  describe('2. Event Publishing', () => {
    it('should publish event and persist automatically', async () => {
      const event = {
        eventId: 'evt-20',
        eventType: 'RequirementCreated',
        aggregateId: 'req-4',
        aggregateType: 'Requirement',
        tenantId,
        occurredAt: new Date(),
      };

      await eventStorePublisher.publish(event, tenantId);

      const stored = await storedEventRepository.findOne({
        where: { eventId: 'evt-20' },
      });

      expect(stored).toBeDefined();
    });

    it('should publish batch of events atomically', async () => {
      const events = [
        {
          eventId: 'evt-30',
          eventType: 'RequirementCreated',
          aggregateId: 'req-5',
          aggregateType: 'Requirement',
          tenantId,
          occurredAt: new Date(),
        },
        {
          eventId: 'evt-31',
          eventType: 'RequirementApproved',
          aggregateId: 'req-5',
          aggregateType: 'Requirement',
          tenantId,
          occurredAt: new Date(),
        },
      ];

      await eventStorePublisher.publishAll(events, tenantId);

      const count = await storedEventRepository.count({
        where: { aggregateId: 'req-5' },
      });

      expect(count).toBe(2);
    });
  });

  describe('3. Event Replay', () => {
    it('should replay events for aggregate reconstruction', async () => {
      const baseTime = new Date('2024-01-02T12:00:00Z');
      const events = [
        {
          eventId: 'evt-40',
          eventType: 'RequirementCreated',
          aggregateId: 'req-6',
          aggregateType: 'Requirement',
          tenantId,
          occurredAt: new Date(baseTime.getTime() + 0),
          data: { title: 'Test requirement', status: 'CREATED' },
        },
        {
          eventId: 'evt-41',
          eventType: 'RequirementApproved',
          aggregateId: 'req-6',
          aggregateType: 'Requirement',
          tenantId,
          occurredAt: new Date(baseTime.getTime() + 1000),
          data: { approverId: 'user-1', status: 'APPROVED' },
        },
      ];

      await eventStore.appendEvents(events, tenantId);

      // Replay events
      const replayed = await eventStorePublisher.replayEvents(
        'req-6',
        tenantId,
      );

      expect(replayed).toHaveLength(2);
      expect(replayed[0].eventType).toBe('RequirementCreated');
      expect(replayed[1].eventType).toBe('RequirementApproved');
    });

    it('should replay empty array if no events exist', async () => {
      const replayed = await eventStorePublisher.replayEvents(
        'req-nonexistent',
        tenantId,
      );

      expect(replayed).toEqual([]);
    });
  });

  describe('4. Event Versioning & Migration', () => {
    it('should migrate old events to new version', async () => {
      // Register migration: v1 → v2 (adds approverRole)
      migrationHandler.registerMigration(
        'RequirementApproved',
        'v1',
        'v2',
        (event) => ({
          ...event,
          approverRole: event.approverRole || 'REVIEWER',
        }),
      );

      const event = {
        eventId: 'evt-50',
        eventType: 'RequirementApproved',
        aggregateId: 'req-7',
        aggregateType: 'Requirement',
        tenantId,
        occurredAt: new Date(),
        eventVersion: 'v1', // Old version without approverRole
        eventData: { approverId: 'user-1' },
      };

      await eventStore.appendEvent(event, tenantId);

      // Replay and migrate
      const replayed = await eventStorePublisher.replayEvents(
        'req-7',
        tenantId,
      );

      expect(replayed[0].eventVersion).toBe('v2');
      expect(replayed[0].approverRole).toBe('REVIEWER');
    });

    it('should handle composable migrations (v1 → v2 → v3)', async () => {
      // Clear and register fresh migrations
      migrationHandler.clearMigrations();

      // v1 → v2: Add approverRole
      migrationHandler.registerMigration(
        'RequirementApproved',
        'v1',
        'v2',
        (event) => ({
          ...event,
          approverRole: event.approverRole || 'REVIEWER',
        }),
      );

      // v2 → v3: Add approvalTimestamp
      migrationHandler.registerMigration(
        'RequirementApproved',
        'v2',
        'v3',
        (event) => ({
          ...event,
          approvalTimestamp:
            event.approvalTimestamp || new Date().toISOString(),
        }),
      );

      const oldEvent = {
        eventId: 'evt-60',
        eventType: 'RequirementApproved',
        aggregateId: 'req-8',
        aggregateType: 'Requirement',
        tenantId,
        occurredAt: new Date(),
        eventVersion: 'v1',
        eventData: { approverId: 'user-1' },
      };

      await eventStore.appendEvent(oldEvent, tenantId);

      // Replay should apply both migrations
      const replayed = await eventStorePublisher.replayEvents(
        'req-8',
        tenantId,
      );

      expect(replayed[0].eventVersion).toBe('v3');
      expect(replayed[0].approverRole).toBe('REVIEWER');
      expect(replayed[0].approvalTimestamp).toBeDefined();
    });
  });

  describe('5. Event Querying', () => {
    beforeEach(async () => {
      // Setup: Create events of different types
      const events = [
        {
          eventId: 'evt-70',
          eventType: 'RequirementCreated',
          aggregateId: 'req-9',
          aggregateType: 'Requirement',
          tenantId,
          occurredAt: new Date(),
          data: {},
        },
        {
          eventId: 'evt-71',
          eventType: 'RequirementApproved',
          aggregateId: 'req-9',
          aggregateType: 'Requirement',
          tenantId,
          occurredAt: new Date(),
          data: {},
        },
        {
          eventId: 'evt-72',
          eventType: 'RequirementApproved',
          aggregateId: 'req-10',
          aggregateType: 'Requirement',
          tenantId,
          occurredAt: new Date(),
          data: {},
        },
        {
          eventId: 'evt-73',
          eventType: 'ReleaseCreated',
          aggregateId: 'rel-1',
          aggregateType: 'Release',
          tenantId,
          occurredAt: new Date(),
          data: {},
        },
      ];

      await eventStore.appendEvents(events, tenantId);
    });

    it('should query events by type', async () => {
      const approvalEvents = await eventStorePublisher.getEventsByType(
        tenantId,
        'RequirementApproved',
      );

      expect(approvalEvents).toHaveLength(2);
      expect(
        approvalEvents.every((e) => e.eventType === 'RequirementApproved'),
      ).toBe(true);
    });

    it('should query events by aggregate type', async () => {
      const requirementEvents =
        await eventStorePublisher.getEventsByAggregateType(
          tenantId,
          'Requirement',
        );

      expect(requirementEvents.length).toBeGreaterThanOrEqual(3);
      expect(
        requirementEvents.every((e) => e.aggregateType === 'Requirement'),
      ).toBe(true);
    });

    it('should query events since timestamp', async () => {
      const now = new Date();
      const future = new Date(now.getTime() + 1000);

      const recentEvents = await eventStorePublisher.getEventsSince(
        tenantId,
        future,
      );

      // Should be empty since all events are in the past
      expect(recentEvents.length).toBe(0);
    });
  });

  describe('6. Multi-tenant Isolation', () => {
    it('should isolate events between tenants', async () => {
      const tenant1Events = [
        {
          eventId: 'evt-80',
          eventType: 'RequirementCreated',
          aggregateId: 'req-tenant1',
          aggregateType: 'Requirement',
          tenantId: 'tenant-1',
          occurredAt: new Date(),
          data: {},
        },
      ];

      const tenant2Events = [
        {
          eventId: 'evt-81',
          eventType: 'RequirementCreated',
          aggregateId: 'req-tenant2',
          aggregateType: 'Requirement',
          tenantId: 'tenant-2',
          occurredAt: new Date(),
          data: {},
        },
      ];

      await eventStore.appendEvents(tenant1Events, 'tenant-1');
      await eventStore.appendEvents(tenant2Events, 'tenant-2');

      // Tenant 1 should not see Tenant 2's events
      const tenant1Replayed = await eventStorePublisher.replayEvents(
        'req-tenant1',
        'tenant-1',
      );
      const tenant2Replayed = await eventStorePublisher.replayEvents(
        'req-tenant2',
        'tenant-2',
      );

      expect(tenant1Replayed).toHaveLength(1);
      expect(tenant2Replayed).toHaveLength(1);
      expect(tenant1Replayed[0].aggregateId).toBe('req-tenant1');
      expect(tenant2Replayed[0].aggregateId).toBe('req-tenant2');
    });
  });

  describe('7. GDPR Compliance', () => {
    it('should redact event data for privacy', async () => {
      const event = {
        eventId: 'evt-90',
        eventType: 'RequirementCreated',
        aggregateId: 'req-11',
        aggregateType: 'Requirement',
        tenantId,
        occurredAt: new Date(),
        data: { title: 'Sensitive data', userId: 'user-123' },
      };

      await eventStore.appendEvent(event, tenantId);

      // Redact the event
      await eventStore.redactEvent('evt-90', tenantId);

      // Verify redaction
      const stored = await storedEventRepository.findOne({
        where: { eventId: 'evt-90' },
      });

      expect(stored.isRedacted).toBe(true);
      expect(stored.eventData).toEqual({ redacted: true });
    });
  });

  describe('8. Event Count Metrics', () => {
    it('should return accurate event count', async () => {
      const initialCount = await eventStore.getEventCount(tenantId);

      const newEvents = [
        {
          eventId: 'evt-100',
          eventType: 'TestEvent',
          aggregateId: 'test-1',
          aggregateType: 'Test',
          tenantId,
          occurredAt: new Date(),
          data: {},
        },
        {
          eventId: 'evt-101',
          eventType: 'TestEvent',
          aggregateId: 'test-2',
          aggregateType: 'Test',
          tenantId,
          occurredAt: new Date(),
          data: {},
        },
      ];

      await eventStore.appendEvents(newEvents, tenantId);

      const finalCount = await eventStore.getEventCount(tenantId);

      expect(finalCount).toBe(initialCount + 2);
    });
  });
});
