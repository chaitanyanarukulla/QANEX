import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { RequirementsService } from './requirements.service';
import { Requirement } from './requirement.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateRequirementDto } from './dto/create-requirement.dto';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';

@Controller('requirements')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RequirementsController {
  constructor(private readonly requirementsService: RequirementsService) {}

  @Post()
  create(
    @Body() dto: CreateRequirementDto,
    @Request() req: AuthenticatedRequest,
  ) {
    // Controller passes DTO and User object (containing tenantId)
    return this.requirementsService.create(dto, req.user);
  }

  @Get()
  findAll(@Request() req: AuthenticatedRequest): Promise<Requirement[]> {
    const tenantId = req.user.tenantId || 'mock-tenant-id';
    return this.requirementsService.findAll(tenantId);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<Requirement> {
    const tenantId = req.user.tenantId || 'mock-tenant-id';
    return this.requirementsService.findOne(id, tenantId);
  }

  @Post(':id/analyze')
  analyze(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<Requirement> {
    const tenantId = req.user.tenantId || 'mock-tenant-id';
    return this.requirementsService.analyze(id, tenantId);
  }

  @Post(':id/assign/:sprintId')
  assignToSprint(
    @Param('id') id: string,
    @Param('sprintId') sprintId: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<Requirement> {
    const tenantId = req.user.tenantId || 'mock-tenant-id';
    return this.requirementsService.assignToSprint(id, sprintId, tenantId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.requirementsService.remove(
      id,
      req.user.tenantId || 'mock-tenant-id',
    );
  }
}
