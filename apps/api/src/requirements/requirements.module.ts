import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RequirementsService } from './requirements.service';
import { RequirementsController } from './requirements.controller';
import { Requirement } from './requirement.entity';
import { SprintItem } from '../sprints/sprint-item.entity';
import { AiModule } from '../ai/ai.module';
import { EventStoreModule } from '../common/event-store/event-store.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Requirement, SprintItem]),
    forwardRef(() => AiModule),
    EventStoreModule,
  ],
  providers: [RequirementsService],
  controllers: [RequirementsController],
  exports: [RequirementsService],
})
export class RequirementsModule {}
