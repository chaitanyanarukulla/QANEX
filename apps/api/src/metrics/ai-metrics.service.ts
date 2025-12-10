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

  async logUsage(
    tenantId: string,
    action: string,
    provider: string,
    model: string,
    latencyMs: number,
    tokens?: { prompt: number; completion: number; total: number },
    success: boolean = true,
  ) {
    let estimatedCost = 0;
    if (tokens) {
      // Simple mock cost calculation (e.g. $0.03 input, $0.06 output per 1k / 1000)
      // Adjust based on model if needed. keeping it simple.
      estimatedCost = (tokens.prompt * 0.00003) + (tokens.completion * 0.00006);
    }

    const log = this.aiLogRepository.create({
      tenantId,
      action,
      provider,
      model,
      latencyMs,
      promptTokens: tokens?.prompt || 0,
      completionTokens: tokens?.completion || 0,
      totalTokens: tokens?.total || 0,
      estimatedCost,
      success,
    });
    await this.aiLogRepository.save(log);
  }

  async getStats(tenantId: string) {
    const logs = await this.aiLogRepository.find({ where: { tenantId } });
    const totalCalls = logs.length;
    const avgLatency =
      totalCalls > 0
        ? logs.reduce((sum, log) => sum + log.latencyMs, 0) / totalCalls
        : 0;

    const totalCost = logs.reduce((sum, log) => sum + (log.estimatedCost || 0), 0);

    return {
      totalCalls,
      avgLatency: Math.round(avgLatency),
      totalCost,
      breakdown: {
        analyze: logs.filter((l) => l.action === 'ANALYZE_REQUIREMENT').length,
        triage: logs.filter((l) => l.action === 'TRIAGE_BUG').length,
        codegen: logs.filter((l) => l.action === 'CODE_GEN').length,
        chat: logs.filter((l) => l.action === 'CHAT').length,
      },
    };
  }

  async getUsageHistory(tenantId: string, days: number = 30) {
    // Group by date
    const query = this.aiLogRepository.createQueryBuilder('log')
      .select("DATE(log.timestamp)", "date")
      .addSelect("SUM(log.totalTokens)", "tokens")
      .addSelect("SUM(log.estimatedCost)", "cost")
      .addSelect("COUNT(log.id)", "requests")
      .where("log.tenantId = :tenantId", { tenantId })
      .andWhere("log.timestamp > NOW() - INTERVAL '30 days'") // For Postgres
      .groupBy("DATE(log.timestamp)")
      .orderBy("date", "ASC");

    const results = await query.getRawMany();

    // Check if results are empty to avoid frontend crashing on empty array
    if (!results) return [];

    return results.map(r => ({
      date: r.date,
      tokens: Number(r.tokens),
      cost: Number(r.cost),
      requests: Number(r.requests)
    }));
  }
}
