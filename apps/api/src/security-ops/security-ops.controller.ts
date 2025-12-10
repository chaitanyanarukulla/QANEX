import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { SecurityOpsService } from './security-ops.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('security-ops')
@UseGuards(JwtAuthGuard)
export class SecurityOpsController {
  constructor(private securityOpsService: SecurityOpsService) {}

  @Get()
  async findAll(@Request() req: any) {
    return this.securityOpsService.findAll(req.user.tenantId);
  }

  @Get('score')
  async getScore(@Request() req: any, @Query('releaseId') releaseId?: string) {
    return this.securityOpsService.calculateSoScore(
      req.user.tenantId,
      releaseId,
    );
  }

  @Get('release/:releaseId')
  async findByRelease(
    @Param('releaseId') releaseId: string,
    @Request() req: any,
  ) {
    return this.securityOpsService.findByRelease(releaseId, req.user.tenantId);
  }

  @Post('scan')
  async runScan(@Request() req: any, @Query('releaseId') releaseId?: string) {
    return this.securityOpsService.runMockScan(req.user.tenantId, releaseId);
  }
}
