import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BugsService } from './bugs.service';
import { BugsController } from './bugs.controller';
import { Bug } from './bug.entity';
import { BugTriageService } from './bug-triage.service';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [TypeOrmModule.forFeature([Bug]), forwardRef(() => AiModule)],
  providers: [BugsService, BugTriageService],
  controllers: [BugsController],
  exports: [BugsService],
})
export class BugsModule {}
