import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SprintsService } from './sprints.service';
import { SprintsController } from './sprints.controller';
import { Sprint } from './sprint.entity';
import { SprintItem } from './sprint-item.entity';
import { EventStoreModule } from '../common/event-store/event-store.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Sprint, SprintItem]),
    forwardRef(() => EventStoreModule),
  ],
  providers: [SprintsService],
  controllers: [SprintsController],
  exports: [SprintsService],
})
export class SprintsModule {}
