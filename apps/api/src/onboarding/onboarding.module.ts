import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OnboardingService } from './onboarding.service';
import { OnboardingController } from './onboarding.controller';
import { Project } from '../projects/project.entity';
import { Requirement } from '../requirements/requirement.entity';
import { Sprint } from '../sprints/sprint.entity';
import { TestCase } from '../test-keys/test-case.entity';
import { TestRun } from '../test-keys/test-run.entity';
import { Bug } from '../bugs/bug.entity';
import { Release } from '../releases/release.entity';
import { AutomationCandidate } from '../test-automation/automation-candidate.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Project,
      Requirement,
      Sprint,
      TestCase,
      TestRun,
      Bug,
      Release,
      AutomationCandidate,
    ]),
  ],
  controllers: [OnboardingController],
  providers: [OnboardingService],
  exports: [OnboardingService],
})
export class OnboardingModule {}
