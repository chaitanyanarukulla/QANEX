import { Controller, Get, Post, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TestAutomationService } from './test-automation.service';
import { AutomationCandidateService } from './automation-candidate.service';

@Controller('automation')
@UseGuards(JwtAuthGuard)
export class TestAutomationController {
    constructor(
        private automationService: TestAutomationService,
        private candidateService: AutomationCandidateService
    ) { }

    @Get('candidates')
    async getCandidates(@Request() req: any) {
        // Mock projectId for now, in real app get from query or header
        const projectId = 'default-project';
        return this.candidateService.getCandidates(req.user.tenantId, projectId);
    }

    @Get('candidates/ai-suggestions')
    async getAISuggestions(@Request() req: any, @Query('limit') limit?: string) {
        const projectId = 'default-project';
        const limitNum = limit ? parseInt(limit, 10) : 10;
        return this.candidateService.getAutomationCandidatesWithAI(req.user.tenantId, projectId, limitNum);
    }

    @Get('coverage')
    async getCoverage(@Request() req: any) {
        const projectId = 'default-project';
        return this.candidateService.getAutomationCoverage(req.user.tenantId, projectId);
    }

    @Post('candidates')
    async createCandidate(@Request() req: any, @Body() body: { testCaseId: string, notes?: string }) {
        const projectId = 'default-project';
        return this.candidateService.createCandidate(req.user.tenantId, projectId, body.testCaseId, body.notes);
    }

    @Post('candidates/:id/generate-pr')
    async generatePr(@Request() req: any, @Param('id') id: string) {
        const projectId = 'default-project';
        return this.automationService.generatePr(req.user.tenantId, projectId, id);
    }
}
