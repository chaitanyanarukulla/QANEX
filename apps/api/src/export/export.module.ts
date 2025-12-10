import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExportService } from './export.service';
import { ExportController } from './export.controller';
import { Requirement } from '../requirements/requirement.entity';
import { Bug } from '../bugs/bug.entity';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([Requirement, Bug]),
    // Add other repositories here if needed for export
  ],
  controllers: [ExportController],
  providers: [ExportService],
  exports: [ExportService],
})
export class ExportModule {}
