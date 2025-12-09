import { Controller, Get } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Controller('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Basic health check - always returns OK if server is running
   */
  @Get()
  health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'qanexus-api',
      version: process.env.npm_package_version || '1.0.0',
    };
  }

  /**
   * Liveness probe - is the service alive?
   */
  @Get('live')
  live() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Readiness probe - is the service ready to accept traffic?
   * Checks database connectivity
   */
  @Get('ready')
  async ready() {
    const checks: Record<string, { status: string; message?: string }> = {};

    // Check database connection
    try {
      await this.dataSource.query('SELECT 1');
      checks.database = { status: 'ok' };
    } catch (error) {
      checks.database = {
        status: 'error',
        message: error instanceof Error ? error.message : 'Database connection failed',
      };
    }

    // Check pgvector extension
    try {
      const result = await this.dataSource.query(
        "SELECT extversion FROM pg_extension WHERE extname = 'vector'",
      );
      if (result.length > 0) {
        checks.pgvector = { status: 'ok', message: `v${result[0].extversion}` };
      } else {
        checks.pgvector = { status: 'warning', message: 'Extension not installed' };
      }
    } catch {
      checks.pgvector = { status: 'warning', message: 'Could not check extension' };
    }

    const allHealthy = Object.values(checks).every(
      (check) => check.status === 'ok' || check.status === 'warning',
    );

    return {
      status: allHealthy ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      checks,
    };
  }
}
