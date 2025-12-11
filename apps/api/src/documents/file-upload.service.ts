import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as mammoth from 'mammoth';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdf = require('pdf-parse');

@Injectable()
export class FileUploadService {
  private readonly logger = new Logger(FileUploadService.name);

  async extractText(file: Express.Multer.File): Promise<string> {
    const mimeType = file.mimetype;

    this.logger.log(
      `Extracting text from file: ${file.originalname} (${mimeType})`,
    );

    try {
      if (mimeType === 'application/pdf') {
        return await this.extractPdf(file.buffer);
      } else if (
        mimeType ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ) {
        return await this.extractDocx(file.buffer);
      } else if (mimeType === 'text/plain' || mimeType === 'text/markdown') {
        return file.buffer.toString('utf-8');
      } else {
        throw new BadRequestException('Unsupported file type');
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to extract text: ${msg} `, stack);
      throw new BadRequestException('Failed to process file');
    }
  }

  private async extractPdf(buffer: Buffer): Promise<string> {
    const data = await pdf(buffer);
    return data.text;
  }

  private async extractDocx(buffer: Buffer): Promise<string> {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }
}
