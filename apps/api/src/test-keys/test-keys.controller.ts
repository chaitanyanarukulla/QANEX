import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { TestKeysService } from './test-keys.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TestResultStatus } from './test-result.entity';

@Controller('tests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TestKeysController {
    constructor(private readonly testKeysService: TestKeysService) { }

    @Post('cases')
    createCase(@Body() dto: any, @Request() req: any) {
        const tenantId = req.user.tenantId || 'mock-tenant-id';
        return this.testKeysService.createTestCase(dto, tenantId);
    }

    @Get('cases')
    findAllCases(@Request() req: any) {
        const tenantId = req.user.tenantId || 'mock-tenant-id';
        return this.testKeysService.findAllTestCases(tenantId);
    }

    @Post('runs')
    createRun(@Body() dto: { name: string }, @Request() req: any) {
        const tenantId = req.user.tenantId || 'mock-tenant-id';
        return this.testKeysService.createTestRun(dto.name, tenantId);
    }

    @Get('runs')
    findAllRuns(@Request() req: any) {
        const tenantId = req.user.tenantId || 'mock-tenant-id';
        return this.testKeysService.findAllTestRuns(tenantId);
    }

    @Post('runs/:runId/results')
    recordResult(
        @Param('runId') runId: string,
        @Body() dto: { caseId: string; status: TestResultStatus; notes?: string },
        @Request() req: any
    ) {
        const tenantId = req.user.tenantId || 'mock-tenant-id';
        return this.testKeysService.recordResult(runId, dto.caseId, dto.status, tenantId, dto.notes);
    }
}
