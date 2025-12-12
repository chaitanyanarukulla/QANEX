import { Test, TestingModule } from '@nestjs/testing';
import { EventMigrationHandler } from './event-migration.handler';

describe('EventMigrationHandler', () => {
  let handler: EventMigrationHandler;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EventMigrationHandler],
    }).compile();

    handler = module.get<EventMigrationHandler>(EventMigrationHandler);
  });

  describe('registerMigration', () => {
    it('should register a migration', () => {
      const migration = (event: any) => ({ ...event, newField: 'value' });

      handler.registerMigration(
        'TestEvent',
        'v1',
        'v2',
        migration,
      );

      expect(handler.getLatestVersion('TestEvent')).toBe('v2');
    });

    it('should handle multiple migrations for same event type', () => {
      const migration1 = (event: any) => ({ ...event, field1: 'v1' });
      const migration2 = (event: any) => ({ ...event, field2: 'v2' });

      handler.registerMigration('TestEvent', 'v1', 'v2', migration1);
      handler.registerMigration('TestEvent', 'v2', 'v3', migration2);

      expect(handler.getLatestVersion('TestEvent')).toBe('v3');
    });

    it('should register migrations for different event types', () => {
      const migration1 = (event: any) => event;
      const migration2 = (event: any) => event;

      handler.registerMigration('Event1', 'v1', 'v2', migration1);
      handler.registerMigration('Event2', 'v1', 'v2', migration2);

      expect(handler.getLatestVersion('Event1')).toBe('v2');
      expect(handler.getLatestVersion('Event2')).toBe('v2');
    });
  });

  describe('migrateIfNeeded', () => {
    it('should return event unchanged if at latest version', async () => {
      const event = {
        eventType: 'TestEvent',
        eventVersion: 'v1',
        aggregateId: 'agg-1',
      };

      const result = await handler.migrateIfNeeded(event);

      expect(result).toEqual(event);
    });

    it('should apply single migration', async () => {
      handler.registerMigration(
        'TestEvent',
        'v1',
        'v2',
        (event) => ({ ...event, newField: 'added' }),
      );

      const event = {
        eventType: 'TestEvent',
        eventVersion: 'v1',
        aggregateId: 'agg-1',
      };

      const result = await handler.migrateIfNeeded(event);

      expect(result.eventVersion).toBe('v2');
      expect(result.newField).toBe('added');
    });

    it('should apply composable migrations (v1 -> v2 -> v3)', async () => {
      handler.registerMigration(
        'TestEvent',
        'v1',
        'v2',
        (event) => ({ ...event, field1: 'v1' }),
      );

      handler.registerMigration(
        'TestEvent',
        'v2',
        'v3',
        (event) => ({ ...event, field2: 'v2' }),
      );

      const event = {
        eventType: 'TestEvent',
        eventVersion: 'v1',
        aggregateId: 'agg-1',
      };

      const result = await handler.migrateIfNeeded(event);

      expect(result.eventVersion).toBe('v3');
      expect(result.field1).toBe('v1');
      expect(result.field2).toBe('v2');
    });

    it('should handle missing eventVersion by treating as v1', async () => {
      handler.registerMigration(
        'TestEvent',
        'v1',
        'v2',
        (event) => ({ ...event, upgraded: true }),
      );

      const event = {
        eventType: 'TestEvent',
        aggregateId: 'agg-1',
        // No eventVersion specified
      };

      const result = await handler.migrateIfNeeded(event);

      expect(result.upgraded).toBe(true);
    });

    it('should skip migration if not registered', async () => {
      const event = {
        eventType: 'UnregisteredEvent',
        eventVersion: 'v1',
        aggregateId: 'agg-1',
      };

      const result = await handler.migrateIfNeeded(event);

      expect(result).toEqual(event);
    });

    it('should throw error if migration fails', async () => {
      handler.registerMigration(
        'TestEvent',
        'v1',
        'v2',
        (event) => {
          throw new Error('Migration failed');
        },
      );

      const event = {
        eventType: 'TestEvent',
        eventVersion: 'v1',
        aggregateId: 'agg-1',
      };

      await expect(handler.migrateIfNeeded(event)).rejects.toThrow(
        'Event migration failed for TestEvent',
      );
    });

    it('should use default values for missing fields', async () => {
      handler.registerMigration(
        'TestEvent',
        'v1',
        'v2',
        (event) => ({
          ...event,
          priority: event.priority || 'MEDIUM',
        }),
      );

      const event = {
        eventType: 'TestEvent',
        eventVersion: 'v1',
        aggregateId: 'agg-1',
      };

      const result = await handler.migrateIfNeeded(event);

      expect(result.priority).toBe('MEDIUM');
    });

    it('should preserve existing data during migration', async () => {
      handler.registerMigration(
        'TestEvent',
        'v1',
        'v2',
        (event) => ({ ...event, newField: 'value' }),
      );

      const event = {
        eventType: 'TestEvent',
        eventVersion: 'v1',
        aggregateId: 'agg-1',
        originalField: 'preserved',
      };

      const result = await handler.migrateIfNeeded(event);

      expect(result.originalField).toBe('preserved');
      expect(result.newField).toBe('value');
    });
  });

  describe('getLatestVersion', () => {
    it('should return v1 as default if no migrations registered', () => {
      const version = handler.getLatestVersion('UnknownEvent');

      expect(version).toBe('v1');
    });

    it('should return registered latest version', () => {
      handler.registerMigration('TestEvent', 'v1', 'v2', (e) => e);

      const version = handler.getLatestVersion('TestEvent');

      expect(version).toBe('v2');
    });
  });

  describe('isMigrationNeeded', () => {
    it('should return false if event is at latest version', () => {
      handler.registerMigration('TestEvent', 'v1', 'v2', (e) => e);

      const event = {
        eventType: 'TestEvent',
        eventVersion: 'v2',
        aggregateId: 'agg-1',
      };

      expect(handler.isMigrationNeeded(event)).toBe(false);
    });

    it('should return true if event is behind latest version', () => {
      handler.registerMigration('TestEvent', 'v1', 'v2', (e) => e);

      const event = {
        eventType: 'TestEvent',
        eventVersion: 'v1',
        aggregateId: 'agg-1',
      };

      expect(handler.isMigrationNeeded(event)).toBe(true);
    });

    it('should return false if no migrations registered', () => {
      const event = {
        eventType: 'UnregisteredEvent',
        eventVersion: 'v1',
        aggregateId: 'agg-1',
      };

      expect(handler.isMigrationNeeded(event)).toBe(false);
    });
  });

  describe('validateEventSchema', () => {
    it('should validate event schema', () => {
      const event = {
        eventType: 'TestEvent',
        aggregateId: 'agg-1',
        score: 85,
      };

      const schema = {
        eventType: 'string',
        aggregateId: 'string',
        score: 'number',
      };

      const isValid = handler.validateEventSchema(event, schema);

      expect(isValid).toBe(true);
    });

    it('should return false if required field missing', () => {
      const event = {
        eventType: 'TestEvent',
        aggregateId: 'agg-1',
      };

      const schema = {
        eventType: 'string',
        aggregateId: 'string',
        score: 'number',
      };

      const isValid = handler.validateEventSchema(event, schema);

      expect(isValid).toBe(false);
    });

    it('should return false if field has wrong type', () => {
      const event = {
        eventType: 'TestEvent',
        aggregateId: 'agg-1',
        score: '85', // string instead of number
      };

      const schema = {
        eventType: 'string',
        aggregateId: 'string',
        score: 'number',
      };

      const isValid = handler.validateEventSchema(event, schema);

      expect(isValid).toBe(false);
    });
  });

  describe('real world scenario', () => {
    it('should handle RequirementApproved evolution', async () => {
      // v1: Basic approval
      // v2: Added approverRole
      // v3: Added approvalTimestamp

      handler.registerMigration(
        'RequirementApproved',
        'v1',
        'v2',
        (event) => ({
          ...event,
          approverRole: event.approverRole || 'REVIEWER',
        }),
      );

      handler.registerMigration(
        'RequirementApproved',
        'v2',
        'v3',
        (event) => ({
          ...event,
          approvalTimestamp: event.approvalTimestamp || new Date().toISOString(),
        }),
      );

      // Old v1 event
      const oldEvent = {
        eventType: 'RequirementApproved',
        eventVersion: 'v1',
        eventId: 'evt-1',
        aggregateId: 'req-1',
        requirementTitle: 'Add authentication',
        approverId: 'user-1',
      };

      const upgradedEvent = await handler.migrateIfNeeded(oldEvent);

      // Should be upgraded to v3 with all fields
      expect(upgradedEvent.eventVersion).toBe('v3');
      expect(upgradedEvent.approverRole).toBe('REVIEWER');
      expect(upgradedEvent.approvalTimestamp).toBeDefined();
      expect(upgradedEvent.requirementTitle).toBe('Add authentication');
      expect(upgradedEvent.approverId).toBe('user-1');
    });

    it('should handle ReleaseReadinessAchieved evolution', async () => {
      handler.registerMigration(
        'ReleaseReadinessAchieved',
        'v1',
        'v2',
        (event) => ({
          ...event,
          deploymentWindow: event.deploymentWindow || {
            startTime: new Date(),
            endTime: new Date(),
          },
        }),
      );

      const oldEvent = {
        eventType: 'ReleaseReadinessAchieved',
        eventVersion: 'v1',
        releaseId: 'rel-1',
        version: '1.2.0',
        score: 85,
      };

      const upgradedEvent = await handler.migrateIfNeeded(oldEvent);

      expect(upgradedEvent.eventVersion).toBe('v2');
      expect(upgradedEvent.deploymentWindow).toBeDefined();
      expect(upgradedEvent.score).toBe(85);
    });
  });

  describe('edge cases', () => {
    it('should handle events with null values', async () => {
      handler.registerMigration(
        'TestEvent',
        'v1',
        'v2',
        (event) => ({
          ...event,
          nullable: event.nullable || null,
        }),
      );

      const event = {
        eventType: 'TestEvent',
        eventVersion: 'v1',
        aggregateId: 'agg-1',
        nullable: null,
      };

      const result = await handler.migrateIfNeeded(event);

      expect(result.nullable).toBeNull();
    });

    it('should handle events with complex nested objects', async () => {
      handler.registerMigration(
        'TestEvent',
        'v1',
        'v2',
        (event) => ({
          ...event,
          metadata: {
            ...event.metadata,
            migratedAt: new Date().toISOString(),
          },
        }),
      );

      const event = {
        eventType: 'TestEvent',
        eventVersion: 'v1',
        aggregateId: 'agg-1',
        metadata: {
          userId: 'user-1',
          source: 'api',
        },
      };

      const result = await handler.migrateIfNeeded(event);

      expect(result.metadata.userId).toBe('user-1');
      expect(result.metadata.source).toBe('api');
      expect(result.metadata.migratedAt).toBeDefined();
    });

    it('should handle large version jumps (v1 to v10)', async () => {
      // Register migrations v1->v2, v2->v3, ..., v9->v10
      for (let i = 1; i < 10; i++) {
        handler.registerMigration(
          'TestEvent',
          `v${i}`,
          `v${i + 1}`,
          (event) => ({ ...event, [`field${i}`]: `value${i}` }),
        );
      }

      const event = {
        eventType: 'TestEvent',
        eventVersion: 'v1',
        aggregateId: 'agg-1',
      };

      const result = await handler.migrateIfNeeded(event);

      expect(result.eventVersion).toBe('v10');
      for (let i = 1; i < 10; i++) {
        expect(result[`field${i}`]).toBe(`value${i}`);
      }
    });
  });
});
