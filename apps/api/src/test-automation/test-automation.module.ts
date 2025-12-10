import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TestAutomationSettings } from './test-automation-settings.entity';
import { AutomationCandidate } from './automation-candidate.entity';
import { AutomationRun } from './automation-run.entity';
import { TestAutomationSettingsService } from './test-automation-settings.service';
import { AutomationCandidateService } from './automation-candidate.service';
import { TestAutomationService } from './test-automation.service';
import { GitIntegrationService } from './git-integration.service';
import { TestCase } from '../test-keys/test-case.entity';
import { TestResult } from '../test-keys/test-result.entity';
import { AiModule } from '../ai/ai.module';
import { TestAutomationController } from './test-automation.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TestAutomationSettings,
      AutomationCandidate,
      AutomationRun,
      TestCase,
      TestResult,
    ]),
    AiModule,
  ],
  controllers: [TestAutomationController],
  providers: [
    TestAutomationSettingsService,
    AutomationCandidateService,
    TestAutomationService,
    GitIntegrationService,
  ],
  exports: [TestAutomationService],
})
export class TestAutomationModule {}
