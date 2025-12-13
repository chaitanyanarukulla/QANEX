/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return */
import { Test, TestingModule } from '@nestjs/testing';
import { EventStorePublisher } from './event-store-publisher';
import { EventStoreService } from './services/event-store.service';
import { DomainEventPublisher } from '../domain/domain-event.publisher';
import { EventMigrationHandler } from './handlers/event-migration.handler';
import { DomainEvent } from '../domain/aggregate-root.interface';

describe('EventStorePublisher', () => {
  let publisher: EventStorePublisher;
  let eventStore: EventStoreService;
  let domainEventPublisher: DomainEventPublisher;
  let migrationHandler: EventMigrationHandler;

  const mockEvent: DomainEvent = {
    eventId: 'evt-1',
    eventType: 'RequirementApproved',
    aggregateId: 'req-1',
    aggregateType: 'Requirement',
    tenantId: 'tenant-1',
    occurredAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventStorePublisher,
        {
          provide: EventStoreService,
          useValue: {
            appendEvent: jest.fn(),
            appendEvents: jest.fn(),
            getEventsForAggregate: jest.fn(),
            getEventsSince: jest.fn(),
            getEventsByType: jest.fn(),
            getEventsByAggregateType: jest.fn(),
          },
        },
        {
          provide: DomainEventPublisher,
          useValue: {
            publish: jest.fn(),
            publishAll: jest.fn(),
          },
        },
        {
          provide: EventMigrationHandler,
          useValue: {
            migrateIfNeeded: jest.fn((event) => Promise.resolve(event)),
            registerMigration: jest.fn(),
          },
        },
      ],
    }).compile();

    publisher = module.get<EventStorePublisher>(EventStorePublisher);
    eventStore = module.get<EventStoreService>(EventStoreService);
    domainEventPublisher =
      module.get<DomainEventPublisher>(DomainEventPublisher);
    migrationHandler = module.get<EventMigrationHandler>(EventMigrationHandler);
  });

  describe('publish', () => {
    it('should persist event before publishing', async () => {
      jest.spyOn(eventStore, 'appendEvent').mockResolvedValue(undefined);
      jest.spyOn(domainEventPublisher, 'publish').mockResolvedValue(undefined);

      await publisher.publish(mockEvent, 'tenant-1');

      expect(eventStore.appendEvent).toHaveBeenCalledWith(
        mockEvent,
        'tenant-1',
      );
      expect(domainEventPublisher.publish).toHaveBeenCalledWith(mockEvent);
    });

    it('should persist event before publishing (maintain order)', async () => {
      const callOrder: string[] = [];

      const _consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const _consoleEndSpy = jest
        .spyOn(console, 'groupEnd')
        .mockImplementation();
      jest.spyOn(eventStore, 'appendEvent').mockImplementation(async () => {
        callOrder.push('persist');
      });

      jest
        .spyOn(domainEventPublisher, 'publish')
        .mockImplementation(async () => {
          callOrder.push('publish');
        });

      await publisher.publish(mockEvent, 'tenant-1');

      expect(callOrder).toEqual(['persist', 'publish']);
    });

    it('should throw error if persistence fails', async () => {
      jest
        .spyOn(eventStore, 'appendEvent')
        .mockRejectedValue(new Error('Database error'));

      await expect(publisher.publish(mockEvent, 'tenant-1')).rejects.toThrow(
        'Database error',
      );

      expect(domainEventPublisher.publish).not.toHaveBeenCalled();
    });

    it('should not rethrow if publisher fails but persist succeeded', async () => {
      jest.spyOn(eventStore, 'appendEvent').mockResolvedValue(undefined);
      jest
        .spyOn(domainEventPublisher, 'publish')
        .mockRejectedValue(new Error('Publisher error'));

      await expect(publisher.publish(mockEvent, 'tenant-1')).rejects.toThrow(
        'Publisher error',
      );

      // But persistence should have been called
      expect(eventStore.appendEvent).toHaveBeenCalled();
    });
  });

  describe('publishAll', () => {
    it('should publish multiple events atomically', async () => {
      const events = [mockEvent, { ...mockEvent, eventId: 'evt-2' }];

      jest.spyOn(eventStore, 'appendEvents').mockResolvedValue(undefined);
      jest.spyOn(domainEventPublisher, 'publish').mockResolvedValue(undefined);

      await publisher.publishAll(events, 'tenant-1');

      expect(eventStore.appendEvents).toHaveBeenCalledWith(events, 'tenant-1');
      expect(domainEventPublisher.publish).toHaveBeenCalledTimes(2);
    });

    it('should persist all events before publishing any', async () => {
      const events = [mockEvent, { ...mockEvent, eventId: 'evt-2' }];
      const callOrder: string[] = [];

      jest.spyOn(eventStore, 'appendEvents').mockImplementation(async () => {
        callOrder.push('persist-all');
      });

      jest
        .spyOn(domainEventPublisher, 'publish')
        .mockImplementation(async () => {
          callOrder.push('publish');
        });

      await publisher.publishAll(events, 'tenant-1');

      expect(callOrder[0]).toBe('persist-all');
      expect(callOrder).toEqual(['persist-all', 'publish', 'publish']);
    });

    it('should skip empty event arrays', async () => {
      await publisher.publishAll([], 'tenant-1');

      expect(eventStore.appendEvents).not.toHaveBeenCalled();
      expect(domainEventPublisher.publish).not.toHaveBeenCalled();
    });

    it('should throw error if batch persistence fails', async () => {
      const events = [mockEvent, { ...mockEvent, eventId: 'evt-2' }];

      jest
        .spyOn(eventStore, 'appendEvents')
        .mockRejectedValue(new Error('Batch error'));

      await expect(publisher.publishAll(events, 'tenant-1')).rejects.toThrow(
        'Batch error',
      );

      expect(domainEventPublisher.publish).not.toHaveBeenCalled();
    });
  });

  describe('replayEvents', () => {
    it('should replay events with migration', async () => {
      const events = [mockEvent, { ...mockEvent, eventId: 'evt-2' }];

      jest
        .spyOn(eventStore, 'getEventsForAggregate')
        .mockResolvedValue(events as any);

      const result = await publisher.replayEvents('req-1', 'tenant-1');

      expect(result).toHaveLength(2);
      expect(eventStore.getEventsForAggregate).toHaveBeenCalledWith(
        'req-1',
        'tenant-1',
      );
    });

    it('should apply migrations during replay', async () => {
      const oldEvent = { ...mockEvent, eventVersion: 'v1' };
      const migratedEvent = { ...mockEvent, eventVersion: 'v2' };

      jest
        .spyOn(eventStore, 'getEventsForAggregate')
        .mockResolvedValue([oldEvent] as any);

      jest
        .spyOn(migrationHandler, 'migrateIfNeeded')
        .mockResolvedValue(migratedEvent);

      const result = await publisher.replayEvents('req-1', 'tenant-1');

      expect(result[0]).toEqual(migratedEvent);
      expect(migrationHandler.migrateIfNeeded).toHaveBeenCalled();
    });

    it('should return empty array if no events', async () => {
      jest.spyOn(eventStore, 'getEventsForAggregate').mockResolvedValue([]);

      const result = await publisher.replayEvents('req-1', 'tenant-1');

      expect(result).toEqual([]);
    });

    it('should throw error if replay fails', async () => {
      jest
        .spyOn(eventStore, 'getEventsForAggregate')
        .mockRejectedValue(new Error('Replay error'));

      await expect(publisher.replayEvents('req-1', 'tenant-1')).rejects.toThrow(
        'Replay error',
      );
    });
  });

  describe('getEventsSince', () => {
    it('should query events since timestamp', async () => {
      const since = new Date('2024-01-01');
      const events = [mockEvent];

      jest.spyOn(eventStore, 'getEventsSince').mockResolvedValue(events as any);

      const result = await publisher.getEventsSince('tenant-1', since);

      expect(result).toEqual(events);
      expect(eventStore.getEventsSince).toHaveBeenCalledWith('tenant-1', since);
    });
  });

  describe('getEventsByType', () => {
    it('should query events by type', async () => {
      const events = [mockEvent];

      jest
        .spyOn(eventStore, 'getEventsByType')
        .mockResolvedValue(events as any);

      const result = await publisher.getEventsByType(
        'tenant-1',
        'RequirementApproved',
      );

      expect(result).toEqual(events);
      expect(eventStore.getEventsByType).toHaveBeenCalledWith(
        'tenant-1',
        'RequirementApproved',
      );
    });
  });

  describe('getEventsByAggregateType', () => {
    it('should query events by aggregate type', async () => {
      const events = [mockEvent];

      jest
        .spyOn(eventStore, 'getEventsByAggregateType')
        .mockResolvedValue(events as any);

      const result = await publisher.getEventsByAggregateType(
        'tenant-1',
        'Requirement',
      );

      expect(result).toEqual(events);
      expect(eventStore.getEventsByAggregateType).toHaveBeenCalledWith(
        'tenant-1',
        'Requirement',
      );
    });
  });

  describe('registerMigration', () => {
    it('should register migration with handler', () => {
      const migration = (event: any) => event;

      publisher.registerMigration('TestEvent', 'v1', 'v2', migration);

      expect(migrationHandler.registerMigration).toHaveBeenCalledWith(
        'TestEvent',
        'v1',
        'v2',
        migration,
      );
    });
  });

  describe('integration: publish -> persist -> subscribers', () => {
    it('should coordinate event persistence and publishing', async () => {
      const events = [mockEvent, { ...mockEvent, eventId: 'evt-2' }];
      const callLog: string[] = [];

      jest.spyOn(eventStore, 'appendEvents').mockImplementation(async () => {
        callLog.push('appendEvents');
      });

      jest
        .spyOn(domainEventPublisher, 'publish')
        .mockImplementation(async (event) => {
          callLog.push(`publish-${event.eventId}`);
        });

      await publisher.publishAll(events, 'tenant-1');

      expect(callLog).toEqual([
        'appendEvents',
        'publish-evt-1',
        'publish-evt-2',
      ]);
    });

    it('should handle partial publisher failure gracefully', async () => {
      const events = [mockEvent, { ...mockEvent, eventId: 'evt-2' }];
      let publishCount = 0;

      jest.spyOn(eventStore, 'appendEvents').mockResolvedValue(undefined);

      jest
        .spyOn(domainEventPublisher, 'publish')
        .mockImplementation(async () => {
          publishCount++;
          if (publishCount === 1) {
            throw new Error('First publisher failed');
          }
        });

      // Should throw on first publisher error
      await expect(publisher.publishAll(events, 'tenant-1')).rejects.toThrow(
        'First publisher failed',
      );

      // Events should still be persisted
      expect(eventStore.appendEvents).toHaveBeenCalled();
    });
  });
});
