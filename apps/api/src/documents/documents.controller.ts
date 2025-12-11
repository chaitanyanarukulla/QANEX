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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsService } from './documents.service';
import { FileUploadService } from './file-upload.service';
import { ConfluenceService } from './confluence.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DocumentSource, DocumentStatus } from './entities/document.entity';

@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
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
    @Request() req: any,
  ) {
    return this.documentsService.create(
      dto,
      req.user.tenantId,
      req.user.userId,
    );
  }

  @Get()
  findAll(@Request() req: any) {
    return this.documentsService.findAll(req.user.tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.documentsService.findOne(id, req.user.tenantId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: { title?: string; content?: string; status?: DocumentStatus },
    @Request() req: any,
  ) {
    return this.documentsService.update(id, dto, req.user.tenantId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    return this.documentsService.remove(id, req.user.tenantId);
  }

  @Post(':id/snapshot')
  createVersion(@Param('id') id: string, @Request() req: any) {
    return this.documentsService.createVersion(id, req.user.tenantId);
  }

  @Post(':id/analyze')
  analyze(@Param('id') id: string, @Request() req: any) {
    return this.documentsService.analyze(id, req.user.tenantId);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
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
    @Request() req: any,
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
