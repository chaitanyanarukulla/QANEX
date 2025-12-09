import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { RequirementsService } from './requirements.service';
import { Requirement } from './requirement.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('requirements')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RequirementsController {
    constructor(private readonly requirementsService: RequirementsService) { }

    @Post()
    create(@Body() dto: { title: string; content: string }, @Request() req: any): Promise<Requirement> {
        // In a real app, tenantId validates against user's tenant
        const tenantId = req.user.tenantId || 'mock-tenant-id';
        return this.requirementsService.create(dto.title, dto.content, tenantId);
    }

    @Get()
    findAll(@Request() req: any): Promise<Requirement[]> {
        const tenantId = req.user.tenantId || 'mock-tenant-id';
        return this.requirementsService.findAll(tenantId);
    }

    @Get(':id')
    findOne(@Param('id') id: string, @Request() req: any): Promise<Requirement> {
        const tenantId = req.user.tenantId || 'mock-tenant-id';
        return this.requirementsService.findOne(id, tenantId);
    }

    @Post(':id/analyze')
    analyze(@Param('id') id: string, @Request() req: any): Promise<Requirement> {
        const tenantId = req.user.tenantId || 'mock-tenant-id';
        return this.requirementsService.analyze(id, tenantId);
    }

    @Post(':id/assign/:sprintId')
    assignToSprint(@Param('id') id: string, @Param('sprintId') sprintId: string, @Request() req: any): Promise<Requirement> {
        const tenantId = req.user.tenantId || 'mock-tenant-id';
        return this.requirementsService.assignToSprint(id, sprintId, tenantId);
    }
}
