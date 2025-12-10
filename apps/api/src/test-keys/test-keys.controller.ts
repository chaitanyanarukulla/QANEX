import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { TestKeysService } from './test-keys.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TestResultStatus } from './test-result.entity';
import { TestPriority } from './test-case.entity';
import { Request as ExpressRequest } from 'express';

@Controller('tests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TestKeysController {
  constructor(private readonly testKeysService: TestKeysService) { }

  // --- Test Cases ---
  @Post('cases')
  createCase(
    @Body()
    dto: {
      title: string;
      description?: string;
      priority?: TestPriority;
      steps?: { step: string; expected: string }[];
    },
    @Request() req: any,
  ) {
    return this.testKeysService.createTestCase(dto, req.user.tenantId);
  }

  @Get('cases')
  findAllCases(@Request() req: any) {
    return this.testKeysService.findAllTestCases(req.user.tenantId);
  }

  @Get('cases/:id')
  findOneCase(@Param('id') id: string, @Request() req: any) {
    return this.testKeysService.findOneTestCase(id, req.user.tenantId);
  }

  @Patch('cases/:id')
  updateCase(
    @Param('id') id: string,
    @Body()
    dto: {
      title?: string;
      description?: string;
      priority?: TestPriority;
      steps?: { step: string; expected: string }[];
    },
    @Request() req: any,
  ) {
    return this.testKeysService.updateTestCase(id, dto, req.user.tenantId);
  }

  @Delete('cases/:id')
  deleteCase(@Param('id') id: string, @Request() req: any) {
    return this.testKeysService.deleteTestCase(id, req.user.tenantId);
  }

  // --- Test Runs ---
  @Post('runs')
  createRun(
    @Body() dto: { name: string },
    @Request() req: any,
  ) {
    return this.testKeysService.createTestRun(dto.name, req.user.tenantId);
  }

  @Get('runs')
  findAllRuns(@Request() req: any) {
    return this.testKeysService.getTestRunsWithStats(req.user.tenantId);
  }

  @Get('runs/:id')
  findOneRun(@Param('id') id: string, @Request() req: any) {
    return this.testKeysService.getTestRunWithStats(id, req.user.tenantId);
  }

  @Post('runs/:id/start')
  startRun(@Param('id') id: string, @Request() req: any) {
    return this.testKeysService.startTestRun(id, req.user.tenantId);
  }

  @Post('runs/:id/complete')
  completeRun(@Param('id') id: string, @Request() req: any) {
    return this.testKeysService.completeTestRun(id, req.user.tenantId);
  }

  @Get('runs/:id/results')
  getRunResults(@Param('id') id: string, @Request() req: any) {
    return this.testKeysService.getResultsForRun(id, req.user.tenantId);
  }

  // --- Test Results ---
  @Post('runs/:runId/results')
  recordResult(
    @Param('runId') runId: string,
    @Body() dto: { caseId: string; status: TestResultStatus; notes?: string },
    @Request() req: any,
  ) {
    return this.testKeysService.recordResult(
      runId,
      dto.caseId,
      dto.status,
      req.user.tenantId,
      dto.notes,
    );
  }

  // --- Metrics ---
  @Get('metrics/pass-rate')
  getPassRate(@Request() req: any) {
    return this.testKeysService.getLatestPassRate(req.user.tenantId);
  }
}
