import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiLog } from './ai-log.entity';

/**
 * Cost per 1K tokens for different models (in USD)
 * Updated pricing as of 2024
 */
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  // OpenAI
  'gpt-4o': { input: 0.005, output: 0.015 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'gpt-4': { input: 0.03, output: 0.06 },
  'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
  'text-embedding-3-small': { input: 0.00002, output: 0 },
  'text-embedding-3-large': { input: 0.00013, output: 0 },
  'text-embedding-ada-002': { input: 0.0001, output: 0 },

  // Google Gemini
  'gemini-1.5-pro': { input: 0.00125, output: 0.005 },
  'gemini-1.5-flash': { input: 0.000075, output: 0.0003 },
  'gemini-1.0-pro': { input: 0.0005, output: 0.0015 },
  'text-embedding-004': { input: 0.00001, output: 0 },

  // Anthropic Claude
  'claude-3-5-sonnet-20241022': { input: 0.003, output: 0.015 },
  'claude-3-5-haiku-20241022': { input: 0.001, output: 0.005 },
  'claude-3-opus-20240229': { input: 0.015, output: 0.075 },
  'claude-3-sonnet-20240229': { input: 0.003, output: 0.015 },
  'claude-3-haiku-20240307': { input: 0.00025, output: 0.00125 },

  // Foundry Local (free - on-device)
  'phi-3.5-mini': { input: 0, output: 0 },
  'phi-4': { input: 0, output: 0 },
  'qwen2.5-0.5b': { input: 0, output: 0 },
  'mistral-7b-instruct-v0.3': { input: 0, output: 0 },
  'llama-3.2-3b-instruct': { input: 0, output: 0 },
  'nomic-embed-text': { input: 0, output: 0 },
  'all-minilm-l6-v2': { input: 0, output: 0 },
};

@Injectable()
export class AiMetricsService {
  constructor(
    @InjectRepository(AiLog)
    private aiLogRepository: Repository<AiLog>,
  ) {}

  /**
   * Calculate cost based on model and token usage
   */
  private calculateCost(
    model: string,
    promptTokens: number,
    completionTokens: number,
  ): number {
    const pricing = MODEL_PRICING[model];
    if (!pricing) {
      // Default pricing for unknown models (conservative estimate)
      return promptTokens * 0.00003 + completionTokens * 0.00006;
    }
    return (
      (promptTokens / 1000) * pricing.input +
      (completionTokens / 1000) * pricing.output
    );
  }

  async logUsage(
    tenantId: string,
    action: string,
    provider: string,
    model: string,
    latencyMs: number,
    tokens?: { prompt: number; completion: number; total: number },
    success: boolean = true,
  ) {
    const promptTokens = tokens?.prompt || 0;
    const completionTokens = tokens?.completion || 0;
    const estimatedCost = this.calculateCost(
      model,
      promptTokens,
      completionTokens,
    );

    const log = this.aiLogRepository.create({
      tenantId,
      action,
      provider,
      model,
      latencyMs,
      promptTokens,
      completionTokens,
      totalTokens: tokens?.total || promptTokens + completionTokens,
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

    const totalCost = logs.reduce(
      (sum, log) => sum + (log.estimatedCost || 0),
      0,
    );

    const totalTokens = logs.reduce(
      (sum, log) => sum + (log.totalTokens || 0),
      0,
    );

    return {
      totalCalls,
      avgLatency: Math.round(avgLatency),
      totalCost: Math.round(totalCost * 10000) / 10000, // 4 decimal places
      totalTokens,
      breakdown: {
        analyze: logs.filter((l) => l.action === 'ANALYZE_REQUIREMENT').length,
        triage: logs.filter((l) => l.action === 'TRIAGE_BUG').length,
        codegen: logs.filter((l) => l.action === 'CODE_GEN').length,
        chat: logs.filter((l) => l.action === 'CHAT').length,
        rcs: logs.filter((l) => l.action === 'EXPLAIN_RCS').length,
        embedding: logs.filter((l) => l.action === 'EMBEDDING').length,
      },
    };
  }

  /**
   * Get stats broken down by provider
   */
  async getStatsByProvider(tenantId: string) {
    const logs = await this.aiLogRepository.find({ where: { tenantId } });

    const providerStats: Record<
      string,
      {
        calls: number;
        tokens: number;
        cost: number;
        avgLatency: number;
        models: Record<string, number>;
      }
    > = {};

    for (const log of logs) {
      if (!providerStats[log.provider]) {
        providerStats[log.provider] = {
          calls: 0,
          tokens: 0,
          cost: 0,
          avgLatency: 0,
          models: {},
        };
      }

      const stats = providerStats[log.provider];
      stats.calls++;
      stats.tokens += log.totalTokens || 0;
      stats.cost += log.estimatedCost || 0;
      stats.avgLatency += log.latencyMs;

      if (!stats.models[log.model]) {
        stats.models[log.model] = 0;
      }
      stats.models[log.model]++;
    }

    // Calculate averages
    for (const provider of Object.keys(providerStats)) {
      const stats = providerStats[provider];
      stats.avgLatency = Math.round(stats.avgLatency / stats.calls);
      stats.cost = Math.round(stats.cost * 10000) / 10000;
    }

    return providerStats;
  }

  /**
   * Get cost breakdown by model
   */
  async getCostByModel(tenantId: string) {
    const logs = await this.aiLogRepository.find({ where: { tenantId } });

    const modelCosts: Record<
      string,
      { calls: number; tokens: number; cost: number }
    > = {};

    for (const log of logs) {
      if (!modelCosts[log.model]) {
        modelCosts[log.model] = { calls: 0, tokens: 0, cost: 0 };
      }
      modelCosts[log.model].calls++;
      modelCosts[log.model].tokens += log.totalTokens || 0;
      modelCosts[log.model].cost += log.estimatedCost || 0;
    }

    // Sort by cost descending
    const sorted = Object.entries(modelCosts)
      .sort((a, b) => b[1].cost - a[1].cost)
      .map(([model, stats]) => ({
        model,
        ...stats,
        cost: Math.round(stats.cost * 10000) / 10000,
      }));

    return sorted;
  }

  async getUsageHistory(tenantId: string, _days: number = 30) {
    // Group by date
    const query = this.aiLogRepository
      .createQueryBuilder('log')
      .select('DATE(log.timestamp)', 'date')
      .addSelect('SUM(log.totalTokens)', 'tokens')
      .addSelect('SUM(log.estimatedCost)', 'cost')
      .addSelect('COUNT(log.id)', 'requests')
      .where('log.tenantId = :tenantId', { tenantId })
      .andWhere("log.timestamp > NOW() - INTERVAL '30 days'") // For Postgres
      .groupBy('DATE(log.timestamp)')
      .orderBy('date', 'ASC');

    const results = await query.getRawMany();

    // Check if results are empty to avoid frontend crashing on empty array
    if (!results) return [];

    return results.map((r) => ({
      date: r.date,
      tokens: Number(r.tokens),
      cost: Number(r.cost),
      requests: Number(r.requests),
    }));
  }

  /**
   * Get usage history broken down by provider
   */
  async getUsageHistoryByProvider(tenantId: string, _days: number = 30) {
    const query = this.aiLogRepository
      .createQueryBuilder('log')
      .select('DATE(log.timestamp)', 'date')
      .addSelect('log.provider', 'provider')
      .addSelect('SUM(log.totalTokens)', 'tokens')
      .addSelect('SUM(log.estimatedCost)', 'cost')
      .addSelect('COUNT(log.id)', 'requests')
      .where('log.tenantId = :tenantId', { tenantId })
      .andWhere("log.timestamp > NOW() - INTERVAL '30 days'")
      .groupBy('DATE(log.timestamp)')
      .addGroupBy('log.provider')
      .orderBy('date', 'ASC');

    const results = await query.getRawMany();

    if (!results) return [];

    return results.map((r) => ({
      date: r.date,
      provider: r.provider,
      tokens: Number(r.tokens),
      cost: Number(r.cost),
      requests: Number(r.requests),
    }));
  }
}
