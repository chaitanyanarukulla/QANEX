import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SprintsService } from './sprints.service';
import { SprintsController } from './sprints.controller';
import { Sprint } from './sprint.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Sprint])],
    providers: [SprintsService],
    controllers: [SprintsController],
    exports: [SprintsService],
})
export class SprintsModule { }
