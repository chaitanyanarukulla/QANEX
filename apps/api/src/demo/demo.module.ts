import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DemoService } from './demo.service';
import { DemoController } from './demo.controller';
import { Project } from '../projects/project.entity';
import { Requirement } from '../requirements/requirement.entity';
import { Sprint } from '../sprints/sprint.entity';
import { TestCase } from '../test-keys/test-case.entity';
import { TestRun } from '../test-keys/test-run.entity';
import { Bug } from '../bugs/bug.entity';
import { Release } from '../releases/release.entity';
import { AiLog } from '../metrics/ai-log.entity';

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
      AiLog,
    ]),
  ],
  controllers: [DemoController],
  providers: [DemoService],
})
export class DemoModule {}
