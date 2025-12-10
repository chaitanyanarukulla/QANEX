import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ReleasesService } from './releases.service';
import { RcsService } from './rcs.service';
import { Release } from './release.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('releases')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReleasesController {
  constructor(
    private readonly releasesService: ReleasesService,
    private readonly rcsService: RcsService,
  ) {}

  @Post()
  create(
    @Body() dto: { version: string; env?: string },
    @Request() req: any,
  ): Promise<Release> {
    const tenantId = req.user.tenantId || 'mock-tenant-id';
    return this.releasesService.create(dto.version, tenantId, dto.env);
  }

  @Get()
  findAll(@Request() req: any): Promise<Release[]> {
    const tenantId = req.user.tenantId || 'mock-tenant-id';
    return this.releasesService.findAll(tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any): Promise<Release> {
    const tenantId = req.user.tenantId || 'mock-tenant-id';
    return this.releasesService.findOne(id, tenantId);
  }

  @Get(':id/rcs')
  async getRcs(@Param('id') id: string, @Request() req: any) {
    const tenantId = req.user.tenantId || 'mock-tenant-id';
    // Recalculate on demand for now (in real app, might cache or trigger async)
    return this.rcsService.calculateRcs(id, tenantId);
  }

  @Post(':id/evaluate-gates')
  async evaluateGates(
    @Param('id') id: string,
    @Body() dto: { overrideReason?: string },
    @Request() req: any,
  ) {
    const tenantId = req.user.tenantId || 'mock-tenant-id';
    return this.rcsService.evaluateReleaseGates(
      id,
      tenantId,
      dto.overrideReason,
    );
  }
}
