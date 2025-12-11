import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ClsService } from 'nestjs-cls';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly cls: ClsService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();

    const httpStatus =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR.valueOf();

    const traceId = this.cls.getId();

    // Safely extract message and stack
    const message =
      exception instanceof Error ? exception.message : 'Unknown error';
    const stack = exception instanceof Error ? exception.stack : null;

    // Safely extract request details
    // We rely on httpAdapter because the request object might be different depending on platform (Express/Fastify)
    // transforming to specific request type if needed, but httpAdapter generic methods are safer.
    const path = httpAdapter.getRequestUrl(ctx.getRequest()) as string;
    const method = httpAdapter.getRequestMethod(ctx.getRequest()) as string;

    this.logger.error('Request failed', {
      context: 'ExceptionFilter',
      trace_id: traceId,
      status: httpStatus,
      path,
      method,
      message,
      stack,
    } as unknown as Record<string, unknown>);

    const responseBody = {
      statusCode: httpStatus,
      timestamp: new Date().toISOString(),
      path,
      message:
        httpStatus === HttpStatus.INTERNAL_SERVER_ERROR.valueOf()
          ? 'Internal server error'
          : message,
      request_id: traceId,
    };

    httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus);
  }
}
