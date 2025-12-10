import { Controller, Get, UseGuards, Query, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuditService } from './audit.service';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) { }

  @Get()
  async getLogs(@Request() req: any, @Query('limit') limit: number) {
    // Enforce tenant isolation via req.user.tenantId (assuming populated by middleware/guard)
    // For MVP, if middleware populates it:
    const tenantId = (req.user as any)?.tenantId || (req as any).tenantId;
    if (!tenantId) {
      // Should be handled by guard
      return [];
    }
    return this.auditService.getLogs(tenantId, limit || 50);
  }
}
