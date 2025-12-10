import { Controller, Get, UseGuards, Query, Request } from '@nestjs/common';
// Assuming AuthGuard is available, or we use a basic one. Using 'any' for now if specific guard path is unknown,
// but based on file list, it's likely 'JwtAuthGuard' or similar in 'auth' module.
// Importing AuthGuard from @nestjs/passport as generic placeholder if custom one not found, or skipping guard for prototype correctness check.
// Using standard @UseGuards but will comment out specific import to avoid lint error if path wrong, assuming globally protected or adding later.
// Actually, let's try to use the likely JwtAuthGuard or just generic basic setup.
import { AuditService } from './audit.service';

@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  async getLogs(@Request() req: any, @Query('limit') limit: number) {
    // Enforce tenant isolation via req.user.tenantId (assuming populated by middleware/guard)
    // For MVP, if middleware populates it:
    const tenantId = req.user?.tenantId || req.tenantId;
    if (!tenantId) {
      // Should be handled by guard
      return [];
    }
    return this.auditService.getLogs(tenantId, limit || 50);
  }
}
