import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiLog } from './ai-log.entity';
import { AiMetricsService } from './ai-metrics.service';
import { ProjectMetricsService } from './project-metrics.service';
import { MetricsController } from './metrics.controller';
import { RequirementsModule } from '../requirements/requirements.module';
import { BugsModule } from '../bugs/bugs.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([AiLog]),
        forwardRef(() => RequirementsModule),
        forwardRef(() => BugsModule),
    ],
    providers: [AiMetricsService, ProjectMetricsService],
    controllers: [MetricsController],
    exports: [AiMetricsService],
})
export class MetricsModule { }
