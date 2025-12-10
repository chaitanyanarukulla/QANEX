import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { SprintsService } from './sprints.service';
import { Sprint, SprintStatus } from './sprint.entity';
import { SprintItem, SprintItemStatus, SprintItemType, SprintItemPriority } from './sprint-item.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('sprints')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SprintsController {
    constructor(private readonly sprintsService: SprintsService) { }

    // ===== Sprint Management =====

    @Post()
    create(@Body() dto: { name: string; capacity?: number; goal?: string; startDate?: string; endDate?: string }, @Request() req: any): Promise<Sprint> {
        const tenantId = req.user.tenantId || 'mock-tenant-id';
        return this.sprintsService.create(
            dto.name,
            tenantId,
            dto.capacity,
            dto.goal,
            dto.startDate ? new Date(dto.startDate) : undefined,
            dto.endDate ? new Date(dto.endDate) : undefined
        );
    }

    @Get()
    findAll(@Request() req: any): Promise<Sprint[]> {
        const tenantId = req.user.tenantId || 'mock-tenant-id';
        return this.sprintsService.findAll(tenantId);
    }

    @Get('active')
    getActiveSprint(@Request() req: any): Promise<Sprint | null> {
        const tenantId = req.user.tenantId || 'mock-tenant-id';
        return this.sprintsService.getActiveSprint(tenantId);
    }

    @Get(':id')
    findOne(@Param('id') id: string, @Request() req: any): Promise<Sprint> {
        const tenantId = req.user.tenantId || 'mock-tenant-id';
        return this.sprintsService.findOne(id, tenantId);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() dto: Partial<Sprint>, @Request() req: any): Promise<Sprint> {
        const tenantId = req.user.tenantId || 'mock-tenant-id';
        return this.sprintsService.update(id, tenantId, dto);
    }

    @Patch(':id/status')
    updateStatus(@Param('id') id: string, @Body() dto: { status: SprintStatus }, @Request() req: any): Promise<Sprint> {
        const tenantId = req.user.tenantId || 'mock-tenant-id';
        return this.sprintsService.updateStatus(id, tenantId, dto.status);
    }

    // ===== Sprint Item Management =====

    @Post('items')
    addItem(
        @Body() dto: {
            sprintId?: string;
            title: string;
            description?: string;
            type?: SprintItemType;
            priority?: SprintItemPriority;
            status?: SprintItemStatus;
            requirementId?: string;
            rqsScore?: number;
            assigneeId?: string;
            assigneeName?: string;
        },
        @Request() req: any
    ): Promise<SprintItem> {
        const tenantId = req.user.tenantId || 'mock-tenant-id';
        return this.sprintsService.addItem(dto.sprintId || null, tenantId, dto);
    }

    @Get('backlog/items')
    getBacklogItems(@Request() req: any): Promise<SprintItem[]> {
        const tenantId = req.user.tenantId || 'mock-tenant-id';
        return this.sprintsService.getBacklogItems(tenantId);
    }

    @Get(':id/items')
    getSprintItems(@Param('id') id: string, @Request() req: any): Promise<SprintItem[]> {
        const tenantId = req.user.tenantId || 'mock-tenant-id';
        return this.sprintsService.getSprintItems(id, tenantId);
    }

    @Patch('items/:itemId')
    updateItem(
        @Param('itemId') itemId: string,
        @Body() dto: Partial<SprintItem>,
        @Request() req: any
    ): Promise<SprintItem> {
        const tenantId = req.user.tenantId || 'mock-tenant-id';
        return this.sprintsService.updateItem(itemId, tenantId, dto);
    }

    @Patch('items/:itemId/move')
    moveItem(
        @Param('itemId') itemId: string,
        @Body() dto: { sprintId?: string; status?: SprintItemStatus },
        @Request() req: any
    ): Promise<SprintItem> {
        const tenantId = req.user.tenantId || 'mock-tenant-id';
        return this.sprintsService.moveItemToSprint(itemId, dto.sprintId || null, tenantId, dto.status);
    }

    @Delete('items/:itemId')
    removeItem(@Param('itemId') itemId: string, @Request() req: any): Promise<void> {
        const tenantId = req.user.tenantId || 'mock-tenant-id';
        return this.sprintsService.removeItem(itemId, tenantId);
    }

    // ===== Sprint Metrics =====

    @Get(':id/metrics')
    getMetrics(@Param('id') id: string, @Request() req: any) {
        const tenantId = req.user.tenantId || 'mock-tenant-id';
        return this.sprintsService.getSprintMetrics(id, tenantId);
    }

    // ===== AI Planning =====

    @Post('ai/plan')
    planSprint(@Body() dto: { capacity?: number }, @Request() req: any) {
        const tenantId = req.user.tenantId || 'mock-tenant-id';
        return this.sprintsService.planSprint(tenantId, dto.capacity || 20);
    }

    // ===== Option C: Velocity & Burndown =====

    @Post(':id/velocity/calculate')
    calculateVelocity(@Param('id') id: string, @Request() req: any) {
        const tenantId = req.user.tenantId || 'mock-tenant-id';
        return this.sprintsService.calculateVelocity(id, tenantId);
    }

    @Get('velocity/trend')
    getVelocityTrend(@Request() req: any) {
        const tenantId = req.user.tenantId || 'mock-tenant-id';
        return this.sprintsService.getVelocityTrend(tenantId);
    }

    @Get(':id/burndown')
    getBurndownData(@Param('id') id: string, @Request() req: any) {
        const tenantId = req.user.tenantId || 'mock-tenant-id';
        return this.sprintsService.getBurndownData(id, tenantId);
    }

    // ===== Option D: Requirement Import =====

    @Post('items/from-requirements')
    createItemsFromRequirements(
        @Body() dto: { requirementIds: string[]; sprintId?: string },
        @Request() req: any
    ) {
        const tenantId = req.user.tenantId || 'mock-tenant-id';
        return this.sprintsService.createItemsFromRequirements(
            dto.requirementIds,
            dto.sprintId || null,
            tenantId
        );
    }

    @Post('items/task-breakdown')
    generateTaskBreakdown(
        @Body() dto: { requirementId: string; title: string; description: string },
        @Request() req: any
    ) {
        return this.sprintsService.generateTaskBreakdown(
            dto.requirementId,
            dto.title,
            dto.description
        );
    }
}
