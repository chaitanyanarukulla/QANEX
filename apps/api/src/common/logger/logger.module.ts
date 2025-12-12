import { Module } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isProduction = configService.get('NODE_ENV') === 'production';
        const logLevel = configService.get<string>(
          'LOG_LEVEL',
          isProduction ? 'info' : 'debug',
        );

        return {
          level: logLevel,
          transports: [
            new winston.transports.Console({
              format: winston.format.combine(
                winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                winston.format.ms(),
                winston.format.colorize({ all: true }), // Colorize everything for better visibility
                winston.format.printf(
                  ({
                    timestamp,
                    level,
                    message,
                    context,
                    trace_id,
                    ...meta
                  }) => {
                    if (isProduction) {
                      return JSON.stringify({
                        timestamp,
                        level,
                        message,
                        context,
                        trace_id,
                        ...meta,
                      });
                    }

                    // Dev Format: [TIMESTAMP] LEVEL [Context] Message [TraceId]
                    const contextStr = context
                      ? `[${String(context as any)}]`
                      : '';
                    const traceStr = trace_id
                      ? `[${String(trace_id as any)}]`
                      : '';
                    const metaStr = Object.keys(meta).length
                      ? `\n${JSON.stringify(meta, null, 2)}`
                      : '';

                    return `${String(timestamp)} ${String(level)} ${contextStr} ${String(message)} ${traceStr}${metaStr}`;
                  },
                ),
              ),
            }),
          ] as winston.transport[],
        };
      },
    }),
  ],
  exports: [WinstonModule],
})
export class LoggerModule {}
