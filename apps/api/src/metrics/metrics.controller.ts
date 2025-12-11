import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProjectMetricsService } from './project-metrics.service';
import { AiMetricsService } from './ai-metrics.service';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';

@Controller('metrics')
@UseGuards(JwtAuthGuard)
export class MetricsController {
  constructor(
    private readonly projectMetrics: ProjectMetricsService,
    private readonly aiMetrics: AiMetricsService,
  ) {}

  @Get('dashboard')
  async getDashboard(@Request() req: AuthenticatedRequest) {
    const tenantId = req.user.tenantId;
    const project = await this.projectMetrics.getProjectStats(tenantId);
    const ai = await this.aiMetrics.getStats(tenantId);

    return {
      project,
      ai,
    };
  }

  @Get('ai/usage')
  async getAiUsage(@Request() req: AuthenticatedRequest) {
    const tenantId = req.user.tenantId;
    return this.aiMetrics.getUsageHistory(tenantId);
  }

  @Get('ai/providers')
  async getAiUsageByProvider(@Request() req: AuthenticatedRequest) {
    const tenantId = req.user.tenantId;
    return this.aiMetrics.getStatsByProvider(tenantId);
  }

  @Get('ai/models')
  async getAiCostByModel(@Request() req: AuthenticatedRequest) {
    const tenantId = req.user.tenantId;
    return this.aiMetrics.getCostByModel(tenantId);
  }

  @Get('ai/usage/providers')
  async getAiUsageHistoryByProvider(@Request() req: AuthenticatedRequest) {
    const tenantId = req.user.tenantId;
    return this.aiMetrics.getUsageHistoryByProvider(tenantId);
  }
}
