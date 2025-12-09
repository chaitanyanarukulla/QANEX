import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { SprintsService } from './sprints.service';
import { Sprint } from './sprint.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('sprints')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SprintsController {
    constructor(private readonly sprintsService: SprintsService) { }

    @Post()
    create(@Body() dto: { name: string; capacity?: number }, @Request() req: any): Promise<Sprint> {
        const tenantId = req.user.tenantId || 'mock-tenant-id';
        return this.sprintsService.create(dto.name, tenantId, dto.capacity);
    }

    @Get()
    findAll(@Request() req: any): Promise<Sprint[]> {
        const tenantId = req.user.tenantId || 'mock-tenant-id';
        return this.sprintsService.findAll(tenantId);
    }

    @Get(':id')
    findOne(@Param('id') id: string, @Request() req: any): Promise<Sprint> {
        const tenantId = req.user.tenantId || 'mock-tenant-id';
        return this.sprintsService.findOne(id, tenantId);
    }
}
