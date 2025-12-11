import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { Document } from './entities/document.entity';
import { DocumentVersion } from './entities/document-version.entity';
import { DocumentAIReview } from './entities/document-ai-review.entity';
import { AiModule } from '../ai/ai.module';
import { DocumentsAiService } from './documents-ai.service';
import { RequirementsModule } from '../requirements/requirements.module';
import { FileUploadService } from './file-upload.service';
import { ConfluenceService } from './confluence.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Document, DocumentVersion, DocumentAIReview]),
    AiModule,
    RequirementsModule,
  ],
  controllers: [DocumentsController],
  providers: [
    DocumentsService,
    DocumentsAiService,
    FileUploadService,
    ConfluenceService,
  ],
  exports: [DocumentsService],
})
export class DocumentsModule {}
