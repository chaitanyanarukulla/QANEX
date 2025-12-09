import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiLog } from './ai-log.entity';

@Injectable()
export class AiMetricsService {
    constructor(
        @InjectRepository(AiLog)
        private aiLogRepository: Repository<AiLog>,
    ) { }

    async logUsage(tenantId: string, action: string, provider: string, latencyMs: number, success: boolean = true) {
        const log = this.aiLogRepository.create({
            tenantId,
            action,
            provider,
            latencyMs,
            success
        });
        await this.aiLogRepository.save(log);
    }

    async getStats(tenantId: string) {
        const logs = await this.aiLogRepository.find({ where: { tenantId } });
        const totalCalls = logs.length;
        const avgLatency = totalCalls > 0
            ? logs.reduce((sum, log) => sum + log.latencyMs, 0) / totalCalls
            : 0;

        return {
            totalCalls,
            avgLatency: Math.round(avgLatency),
            // Mock breakdown for now/simple aggregation
            breakdown: {
                analyze: logs.filter(l => l.action === 'ANALYZE_REQ').length,
                triage: logs.filter(l => l.action === 'TRIAGE_BUG').length
            }
        };
    }
}
