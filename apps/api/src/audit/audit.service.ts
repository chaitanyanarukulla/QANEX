import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './audit-log.entity';

@Injectable()
export class AuditService {
    private readonly logger = new Logger(AuditService.name);

    constructor(
        @InjectRepository(AuditLog)
        private auditRepository: Repository<AuditLog>,
    ) { }

    async recordEvent(params: {
        tenantId: string;
        userId?: string;
        action: string;
        entityType?: string;
        entityId?: string;
        metadata?: any;
        ipAddress?: string;
    }): Promise<void> {
        try {
            const log = this.auditRepository.create(params);
            await this.auditRepository.save(log);
        } catch (error) {
            // Audit logging failure should not block main flow, but we must log it
            this.logger.error('Failed to write audit log', error);
        }
    }

    async getLogs(tenantId: string, limit: number = 50): Promise<AuditLog[]> {
        return this.auditRepository.find({
            where: { tenantId },
            order: { createdAt: 'DESC' },
            take: limit,
        });
    }
}
