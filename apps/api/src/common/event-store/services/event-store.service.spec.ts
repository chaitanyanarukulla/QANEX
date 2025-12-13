/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventStoreService } from './event-store.service';
import { StoredDomainEvent } from '../entities/stored-domain-event.entity';

describe('EventStoreService', () => {
  let service: EventStoreService;
  let repository: Repository<StoredDomainEvent>;

  const mockEvent = {
    eventId: 'event-1',
    eventType: 'RequirementApproved',
    aggregateId: 'req-1',
    aggregateType: 'Requirement',
    tenantId: 'tenant-1',
    occurredAt: new Date(),
  };

  const mockStoredEvent = {
    eventId: 'event-1',
    tenantId: 'tenant-1',
    aggregateId: 'req-1',
    aggregateType: 'Requirement',
    eventType: 'RequirementApproved',
    eventVersion: 'v1',
    occurredAt: new Date(),
    storedAt: new Date(),
    eventData: mockEvent,
    metadata: {},
    snapshotId: null,
    isRedacted: false,
    toDomainEvent: () => mockEvent,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventStoreService,
        {
          provide: getRepositoryToken(StoredDomainEvent),
          useValue: {
            insert: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<EventStoreService>(EventStoreService);
    repository = module.get<Repository<StoredDomainEvent>>(
      getRepositoryToken(StoredDomainEvent),
    );
  });

  describe('appendEvent', () => {
    it('should append a single event', async () => {
      const insertSpy = jest.spyOn(repository, 'insert').mockResolvedValue({
        identifiers: [],
        generatedMaps: [],
        raw: [],
      });

      await service.appendEvent(mockEvent, 'tenant-1');

      expect(insertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          eventId: mockEvent.eventId,
          aggregateId: mockEvent.aggregateId,
          tenantId: 'tenant-1',
        }),
      );
    });

    it('should measure append performance', async () => {
      jest.spyOn(repository, 'insert').mockResolvedValue({
        identifiers: [],
        generatedMaps: [],
        raw: [],
      });

      const consoleSpy = jest.spyOn(console, 'time').mockImplementation();
      const consoleEndSpy = jest.spyOn(console, 'timeEnd').mockImplementation();

      await service.appendEvent(mockEvent, 'tenant-1');

      expect(repositorySpy).toHaveBeenCalled();
    });

    it('should throw error if append fails', async () => {
      jest
        .spyOn(repository, 'insert')
        .mockRejectedValue(new Error('Database error'));

      await expect(service.appendEvent(mockEvent, 'tenant-1')).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('appendEvents', () => {
    it('should append multiple events atomically', async () => {
      const events = [mockEvent, { ...mockEvent, eventId: 'event-2' }];

      jest.spyOn(repository, 'insert').mockResolvedValue({
        identifiers: [],
        generatedMaps: [],
        raw: [],
      });

      await service.appendEvents(events, 'tenant-1');

      expect(repository.insert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ eventId: 'event-1' }),
          expect.objectContaining({ eventId: 'event-2' }),
        ]),
      );
    });

    it('should skip empty event arrays', async () => {
      const insertSpy = jest.spyOn(repository, 'insert');

      await service.appendEvents([], 'tenant-1');

      expect(insertSpy).not.toHaveBeenCalled();
    });

    it('should throw error if batch append fails', async () => {
      const events = [mockEvent, { ...mockEvent, eventId: 'event-2' }];

      jest
        .spyOn(repository, 'insert')
        .mockRejectedValue(new Error('Batch insert failed'));

      await expect(service.appendEvents(events, 'tenant-1')).rejects.toThrow(
        'Batch insert failed',
      );
    });
  });

  describe('getEventsForAggregate', () => {
    it('should retrieve events for aggregate', async () => {
      const queryBuilder: any = {
        createQueryBuilder: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest
          .fn()
          .mockResolvedValue([mockStoredEvent, mockStoredEvent]),
      };

      jest
        .spyOn(repository, 'createQueryBuilder')
        .mockReturnValue(queryBuilder);

      const events = await service.getEventsForAggregate('req-1', 'tenant-1');

      expect(events).toHaveLength(2);
      expect(queryBuilder.where).toHaveBeenCalledWith(
        'event.aggregateId = :aggregateId',
        { aggregateId: 'req-1' },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'event.tenantId = :tenantId',
        { tenantId: 'tenant-1' },
      );
    });

    it('should order events by occurredAt then storedAt', async () => {
      const queryBuilder: any = {
        createQueryBuilder: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      jest
        .spyOn(repository, 'createQueryBuilder')
        .mockReturnValue(queryBuilder);

      await service.getEventsForAggregate('req-1', 'tenant-1');

      expect(queryBuilder.orderBy).toHaveBeenCalledWith(
        'event.occurredAt',
        'ASC',
      );
      expect(queryBuilder.addOrderBy).toHaveBeenCalledWith(
        'event.storedAt',
        'ASC',
      );
    });

    it('should return empty array if no events found', async () => {
      const queryBuilder: any = {
        createQueryBuilder: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      jest
        .spyOn(repository, 'createQueryBuilder')
        .mockReturnValue(queryBuilder);

      const events = await service.getEventsForAggregate('req-1', 'tenant-1');

      expect(events).toEqual([]);
    });
  });

  describe('getEventsSince', () => {
    it('should retrieve events since timestamp', async () => {
      const since = new Date('2024-01-01');
      const queryBuilder: any = {
        createQueryBuilder: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockStoredEvent]),
      };

      jest
        .spyOn(repository, 'createQueryBuilder')
        .mockReturnValue(queryBuilder);

      const events = await service.getEventsSince('tenant-1', since);

      expect(events).toHaveLength(1);
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'event.occurredAt > :since',
        { since },
      );
    });
  });

  describe('getEventsByType', () => {
    it('should retrieve events by type', async () => {
      const queryBuilder: any = {
        createQueryBuilder: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockStoredEvent]),
      };

      jest
        .spyOn(repository, 'createQueryBuilder')
        .mockReturnValue(queryBuilder);

      const events = await service.getEventsByType(
        'tenant-1',
        'RequirementApproved',
      );

      expect(events).toHaveLength(1);
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'event.eventType = :eventType',
        { eventType: 'RequirementApproved' },
      );
    });
  });

  describe('getEventsByAggregateType', () => {
    it('should retrieve events by aggregate type', async () => {
      const queryBuilder: any = {
        createQueryBuilder: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockStoredEvent]),
      };

      jest
        .spyOn(repository, 'createQueryBuilder')
        .mockReturnValue(queryBuilder);

      const events = await service.getEventsByAggregateType(
        'tenant-1',
        'Requirement',
      );

      expect(events).toHaveLength(1);
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'event.aggregateType = :aggregateType',
        { aggregateType: 'Requirement' },
      );
    });
  });

  describe('getEventCount', () => {
    it('should return event count for tenant', async () => {
      const queryBuilder: any = {
        createQueryBuilder: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(42),
      };

      jest
        .spyOn(repository, 'createQueryBuilder')
        .mockReturnValue(queryBuilder);

      const count = await service.getEventCount('tenant-1');

      expect(count).toBe(42);
    });
  });

  describe('recordSnapshot', () => {
    it('should record snapshot reference', async () => {
      const updateQueryBuilder: any = {
        createQueryBuilder: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 5 }),
      };

      jest
        .spyOn(repository, 'createQueryBuilder')
        .mockReturnValue(updateQueryBuilder);

      await service.recordSnapshot(
        'req-1',
        'tenant-1',
        'snapshot-1',
        'event-1',
      );

      expect(updateQueryBuilder.set).toHaveBeenCalledWith({
        snapshotId: 'snapshot-1',
      });
    });
  });

  describe('redactEvent', () => {
    it('should redact event data for GDPR', async () => {
      const updateQueryBuilder: any = {
        createQueryBuilder: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 1 }),
      };

      jest
        .spyOn(repository, 'createQueryBuilder')
        .mockReturnValue(updateQueryBuilder);

      await service.redactEvent('event-1', 'tenant-1');

      expect(updateQueryBuilder.set).toHaveBeenCalledWith({
        isRedacted: true,
        eventData: { redacted: true },
      });
    });
  });

  describe('clearTenantEvents', () => {
    it('should clear all events for tenant', async () => {
      const deleteQueryBuilder: any = {
        createQueryBuilder: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 100 }),
      };

      jest
        .spyOn(repository, 'createQueryBuilder')
        .mockReturnValue(deleteQueryBuilder);

      await service.clearTenantEvents('tenant-1');

      expect(deleteQueryBuilder.where).toHaveBeenCalledWith(
        'tenantId = :tenantId',
        { tenantId: 'tenant-1' },
      );
    });
  });
});
