import { Injectable, Logger } from '@nestjs/common';

/**
 * Event Migration Handler - Handles schema evolution for domain events
 *
 * Purpose: Support event versioning and migration as domain models evolve
 * without breaking replay of historical events.
 *
 * Scenario: If RequirementApproved event adds a new field (approverRole),
 * old events (v1) without that field can be migrated to v2 format during replay.
 *
 * Architecture:
 * 1. Each event type has explicit versioning (v1, v2, v3, etc.)
 * 2. Migrations are registered per event type
 * 3. Replay automatically applies migrations to upgrade old events
 * 4. Migrations are composable (v1→v2→v3)
 *
 * SLA: Migration < 10ms per event (should be very fast)
 * Usage:
 * ```typescript
 * // Register migration when RequirementApproved adds approverRole
 * migrationHandler.registerMigration('RequirementApproved', 'v1', 'v2', (event) => ({
 *   ...event,
 *   approverRole: event.approverRole || 'REVIEWER', // Default for old events
 * }));
 *
 * // During replay, v1 event is automatically upgraded to v2
 * const upgradedEvent = await migrationHandler.migrateIfNeeded(storedEvent);
 * ```
 *
 * SLA: Migrations must complete within 10ms
 * Throughput: Support 10,000 event migrations/second
 * Consistency: Deterministic - same input always produces same output
 */
@Injectable()
export class EventMigrationHandler {
  private readonly logger = new Logger(EventMigrationHandler.name);

  /**
   * Map of event migrations: eventType → [migration functions from older to newer versions]
   *
   * Structure:
   * {
   *   'RequirementApproved': {
   *     'v1_to_v2': (event) => ({ ...event, newField: defaultValue }),
   *     'v2_to_v3': (event) => ({ ...event, anotherField: computeValue(event) }),
   *   }
   * }
   *
   * This enables composable migrations: v1 → v2 → v3
   */
  private migrations = new Map<
    string,
    Map<string, (event: any) => any>
  >();

  /**
   * Latest version for each event type
   * Used to determine if migration is needed
   */
  private latestVersions = new Map<string, string>();

  constructor() {
    // Initialize with built-in migrations for existing event types
    this.initializeBuiltInMigrations();
  }

  /**
   * Register a migration for an event type
   *
   * Migrations are cumulative and composable:
   * - Register v1→v2
   * - Register v2→v3
   * - Old v1 events are automatically migrated: v1→v2→v3 during replay
   *
   * @param eventType - Event type (e.g., 'RequirementApproved')
   * @param fromVersion - Source version (e.g., 'v1')
   * @param toVersion - Target version (e.g., 'v2')
   * @param migration - Function to transform event from old to new format
   */
  registerMigration(
    eventType: string,
    fromVersion: string,
    toVersion: string,
    migration: (event: any) => any,
  ): void {
    if (!this.migrations.has(eventType)) {
      this.migrations.set(eventType, new Map());
    }

    const migrationKey = `${fromVersion}_to_${toVersion}`;
    this.migrations.get(eventType)!.set(migrationKey, migration);

    // Update latest version
    this.latestVersions.set(eventType, toVersion);

    this.logger.debug(
      `Registered migration for ${eventType}: ${fromVersion} → ${toVersion}`,
    );
  }

  /**
   * Migrate an event to the latest version if needed
   *
   * If event version < latest version, applies all intermediate migrations:
   * v1 event with latest v3 → v1→v2 migration → v2→v3 migration → v3 event
   *
   * @param event - Event to migrate (with eventVersion field)
   * @returns Event in latest version format
   */
  async migrateIfNeeded(event: any): Promise<any> {
    const eventType = event.eventType;
    const currentVersion = event.eventVersion || 'v1';
    const latestVersion = this.latestVersions.get(eventType);

    // No migration needed if at latest version or no migrations registered
    if (!latestVersion || currentVersion === latestVersion) {
      return event;
    }

    // Extract major versions (v1, v2, etc.)
    const currentMajor = this.parseMajorVersion(currentVersion);
    const latestMajor = this.parseMajorVersion(latestVersion);

    // Apply migrations sequentially
    let migratedEvent = { ...event };

    for (let v = currentMajor; v < latestMajor; v++) {
      const fromVersion = `v${v}`;
      const toVersion = `v${v + 1}`;
      const migrationKey = `${fromVersion}_to_${toVersion}`;

      const migration = this.migrations
        .get(eventType)
        ?.get(migrationKey);

      if (!migration) {
        this.logger.warn(
          `No migration found for ${eventType}: ${migrationKey}`,
        );
        continue;
      }

      try {
        migratedEvent = migration(migratedEvent);
        migratedEvent.eventVersion = toVersion;

        this.logger.debug(
          `Migrated ${eventType} from ${fromVersion} to ${toVersion}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to migrate ${eventType} from ${fromVersion}: ${(error as any).message}`,
          (error as any).stack,
        );
        throw new Error(
          `Event migration failed for ${eventType} (${migrationKey}): ${(error as any).message}`,
        );
      }
    }

    return migratedEvent;
  }

  /**
   * Get the latest version for an event type
   * Useful for initializing new events
   *
   * @param eventType - Event type to check
   * @returns Latest version or 'v1' as default
   */
  getLatestVersion(eventType: string): string {
    return this.latestVersions.get(eventType) || 'v1';
  }

  /**
   * Check if migration is needed for an event
   *
   * @param event - Event to check
   * @returns true if event is not at latest version
   */
  isMigrationNeeded(event: any): boolean {
    const eventType = event.eventType;
    const currentVersion = event.eventVersion || 'v1';
    const latestVersion = this.latestVersions.get(eventType);

    return !!(latestVersion && currentVersion !== latestVersion);
  }

  /**
   * Validate that an event has the expected structure for its version
   * Useful for catching malformed events
   *
   * @param event - Event to validate
   * @param schema - Expected schema for this version
   * @returns true if event matches schema
   */
  validateEventSchema(event: any, schema: Record<string, any>): boolean {
    try {
      for (const [field, type] of Object.entries(schema)) {
        if (!(field in event)) {
          this.logger.warn(
            `Event ${event.eventType} missing required field: ${field}`,
          );
          return false;
        }

        const actualType = typeof event[field];
        if (actualType !== type) {
          this.logger.warn(
            `Event ${event.eventType} field ${field} has wrong type: expected ${type}, got ${actualType}`,
          );
          return false;
        }
      }

      return true;
    } catch (error) {
      this.logger.error(
        `Error validating event schema: ${(error as any).message}`,
        (error as any).stack,
      );
      return false;
    }
  }

  /**
   * Initialize built-in migrations for existing event types
   * Add migrations here as you evolve events
   *
   * @private
   */
  private initializeBuiltInMigrations(): void {
    // Example: If RequirementApproved adds approverRole field
    // this.registerMigration(
    //   'RequirementApproved',
    //   'v1',
    //   'v2',
    //   (event) => ({
    //     ...event,
    //     approverRole: event.approverRole || 'REVIEWER',
    //   }),
    // );

    // Example: If ReleaseReadinessAchieved adds deploymentWindow field
    // this.registerMigration(
    //   'ReleaseReadinessAchieved',
    //   'v1',
    //   'v2',
    //   (event) => ({
    //     ...event,
    //     deploymentWindow: event.deploymentWindow || { startTime: new Date(), endTime: new Date() },
    //   }),
    // );

    // Add more migrations as events evolve
    this.logger.debug('Initialized built-in event migrations');
  }

  /**
   * Parse major version number from version string
   * e.g., 'v1' → 1, 'v2' → 2, 'v12' → 12
   *
   * @private
   */
  private parseMajorVersion(version: string): number {
    const match = version.match(/v(\d+)/);
    return match ? parseInt(match[1], 10) : 1;
  }

  /**
   * Get all registered migrations
   * Useful for debugging and testing
   *
   * @returns Map of migrations by event type
   */
  getRegisteredMigrations(): Map<string, Map<string, (event: any) => any>> {
    return this.migrations;
  }

  /**
   * Clear all migrations (for testing)
   *
   * @private
   */
  clearMigrations(): void {
    this.migrations.clear();
    this.latestVersions.clear();
  }
}
