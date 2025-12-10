import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProjectMetricsService } from './project-metrics.service';
import { AiMetricsService } from './ai-metrics.service';

@Controller('metrics')
@UseGuards(JwtAuthGuard)
export class MetricsController {
  constructor(
    private readonly projectMetrics: ProjectMetricsService,
    private readonly aiMetrics: AiMetricsService,
  ) {}

  @Get('dashboard')
  async getDashboard(@Request() req: any) {
    const tenantId = req.user.tenantId;
    const project = await this.projectMetrics.getProjectStats(tenantId);
    const ai = await this.aiMetrics.getStats(tenantId);

    return {
      project,
      ai,
    };
  }

  @Get('ai/usage')
  async getAiUsage(@Request() req: any) {
    const tenantId = req.user.tenantId;
    return this.aiMetrics.getUsageHistory(tenantId);
  }
}
