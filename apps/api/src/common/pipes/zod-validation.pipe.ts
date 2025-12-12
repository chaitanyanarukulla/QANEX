import {
  PipeTransform,
  ArgumentMetadata,
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import type { ZodSchema } from 'zod';
import { ZodError } from 'zod';

/**
 * Zod Validation Pipe
 *
 * NestJS pipe that validates request body/params against a Zod schema.
 * Provides clear error messages with field paths and validation details.
 *
 * Usage:
 * ```typescript
 * @Post()
 * create(@Body(new ZodValidationPipe(CreateRequirementSchema)) dto: CreateRequirementDto) {
 *   return this.service.create(dto);
 * }
 * ```
 */
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  transform(value: unknown, metadata: ArgumentMetadata) {
    try {
      const parsedValue = this.schema.parse(value);
      return parsedValue;
    } catch (error) {
      if (error instanceof ZodError && Array.isArray((error as any).errors)) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        const formattedErrors = (error as any).errors.map((err: any) => ({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          path: err.path.length > 0 ? err.path.join('.') : 'root',
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          message: err.message,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          code: err.code,
        }));

        throw new BadRequestException({
          message: 'Validation failed',
          errors: formattedErrors,
          statusCode: 400,
        });
      }

      throw new BadRequestException('Validation failed');
    }
  }
}
