import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RequirementsService } from './requirements.service';
import { RequirementsController } from './requirements.controller';
import { Requirement } from './requirement.entity';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [TypeOrmModule.forFeature([Requirement]), forwardRef(() => AiModule)],
  providers: [RequirementsService],
  controllers: [RequirementsController],
  exports: [RequirementsService],
})
export class RequirementsModule { }
