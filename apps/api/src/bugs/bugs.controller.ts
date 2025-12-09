import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { BugsService } from './bugs.service';
import { BugTriageService } from './bug-triage.service';
import { Bug } from './bug.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('bugs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BugsController {
    constructor(
        private readonly bugsService: BugsService,
        private readonly triageService: BugTriageService
    ) { }

    @Post()
    create(@Body() dto: Partial<Bug>, @Request() req: any): Promise<Bug> {
        const tenantId = req.user.tenantId || 'mock-tenant-id';
        return this.bugsService.create(dto, tenantId);
    }

    @Get()
    findAll(@Request() req: any): Promise<Bug[]> {
        const tenantId = req.user.tenantId || 'mock-tenant-id';
        return this.bugsService.findAll(tenantId);
    }

    @Get(':id')
    findOne(@Param('id') id: string, @Request() req: any): Promise<Bug> {
        const tenantId = req.user.tenantId || 'mock-tenant-id';
        return this.bugsService.findOne(id, tenantId);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() dto: Partial<Bug>, @Request() req: any): Promise<Bug> {
        const tenantId = req.user.tenantId || 'mock-tenant-id';
        return this.bugsService.update(id, dto, tenantId);
    }

    @Delete(':id')
    delete(@Param('id') id: string, @Request() req: any): Promise<void> {
        const tenantId = req.user.tenantId || 'mock-tenant-id';
        return this.bugsService.delete(id, tenantId);
    }

    @Post(':id/triage')
    async triage(@Param('id') id: string, @Request() req: any) {
        const tenantId = req.user.tenantId || 'mock-tenant-id';
        const bug = await this.bugsService.findOne(id, tenantId);
        return this.triageService.analyzeBug(bug);
    }
}
