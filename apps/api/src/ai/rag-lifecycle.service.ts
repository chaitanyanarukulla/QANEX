import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class RagLifecycleService {
  private readonly logger = new Logger(RagLifecycleService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupOldDocuments() {
    this.logger.log('Starting RAG document cleanup...');
    const retentionDays = 90; // Default retention

    try {
      await this.dataSource.query(
        `DELETE FROM rag_documents WHERE created_at < NOW() - INTERVAL '${retentionDays} days'`,
      );

      // result usually contains rowCount in pg, but depends on driver response structure
      // Safe fallback log
      this.logger.log(`Cleanup completed. Removed old RAG documents.`);
    } catch (error) {
      this.logger.error('Failed to clean up old RAG documents', error);
    }
  }
}
