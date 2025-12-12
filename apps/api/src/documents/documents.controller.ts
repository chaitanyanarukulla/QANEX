import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsService } from './documents.service';
import { FileUploadService } from './file-upload.service';
import { ConfluenceService } from './confluence.service';
import { DocumentsAiService } from './documents-ai.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DocumentSource, DocumentStatus } from './entities/document.entity';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';

@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  private readonly logger = new Logger(DocumentsController.name);

  constructor(
    private readonly documentsService: DocumentsService,
    private readonly documentsAiService: DocumentsAiService,
    private readonly fileUploadService: FileUploadService,
    private readonly confluenceService: ConfluenceService,
  ) {}

  @Post()
  create(
    @Body()
    dto: {
      title: string;
      content: string;
      source?: DocumentSource;
      sourceUrl?: string;
    },
    @Request() req: AuthenticatedRequest,
  ) {
    return this.documentsService.create(
      dto,
      req.user.tenantId,
      req.user.userId,
    );
  }

  @Get()
  findAll(@Request() req: AuthenticatedRequest) {
    return this.documentsService.findAll(req.user.tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.documentsService.findOne(id, req.user.tenantId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: { title?: string; content?: string; status?: DocumentStatus },
    @Request() req: AuthenticatedRequest,
  ) {
    return this.documentsService.update(id, dto, req.user.tenantId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.documentsService.remove(id, req.user.tenantId);
  }

  @Post(':id/snapshot')
  createVersion(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.documentsService.createVersion(id, req.user.tenantId);
  }

  @Post(':id/analyze')
  async analyze(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    try {
      this.logger.log(`[Analyze] Starting analysis for document ${id}`);
      const document = await this.documentsService.findOne(
        id,
        req.user.tenantId,
      );
      this.logger.log(`[Analyze] Document found: ${document.title} `);

      const result = await this.documentsAiService.analyzeDocument(
        document,
        req.user.tenantId,
        'REVIEW',
      );
      this.logger.log(
        `[Analyze] Analysis completed successfully for document ${id}`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `[Analyze] Failed to analyze document ${id}:`,
        error instanceof Error ? error.stack : error,
      );
      throw error;
    }
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: AuthenticatedRequest,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const content = await this.fileUploadService.extractText(file);
    const title = file.originalname;

    return this.documentsService.create(
      {
        title,
        content,
        source: DocumentSource.UPLOAD,
      },
      req.user.tenantId,
      req.user.userId,
    );
  }

  @Post('import/confluence')
  async importConfluence(
    @Body()
    dto: {
      siteUrl: string;
      email: string;
      apiToken: string;
      pageId: string;
    },
    @Request() req: AuthenticatedRequest,
  ) {
    const { title, content } = await this.confluenceService.getPage(
      dto.siteUrl,
      dto.email,
      dto.apiToken,
      dto.pageId,
    );

    return this.documentsService.create(
      {
        title,
        content,
        source: DocumentSource.CONFLUENCE,
      },
      req.user.tenantId,
      req.user.userId,
    );
  }
}
