import { Injectable, NestMiddleware, Inject } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ClsService } from 'nestjs-cls';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  constructor(
    private readonly cls: ClsService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl, ip } = req;
    const userAgent = req.get('user-agent') || '';
    const start = Date.now();

    res.on('finish', () => {
      const { statusCode } = res;
      const duration = Date.now() - start;
      const traceId = this.cls.getId();
      /* eslint-disable @typescript-eslint/no-explicit-any */
      /* eslint-disable @typescript-eslint/no-unsafe-assignment */
      const reqAny = req as any;
      const tenantId = reqAny.user?.tenantId || req.headers['x-tenant-id'];
      const userId = reqAny.user?.id || reqAny.user?.userId;
      /* eslint-enable @typescript-eslint/no-explicit-any */
      /* eslint-enable @typescript-eslint/no-unsafe-assignment */

      this.logger.info(
        `${method} ${originalUrl} ${statusCode} - ${duration}ms`,
        {
          context: 'HTTP',
          trace_id: traceId,
          tenantId,
          userId,
          req: {
            method,
            url: originalUrl,
            ip,
            userAgent,
          },
          res: {
            statusCode,
          },
          duration,
        },
      );
    });

    next();
  }
}
