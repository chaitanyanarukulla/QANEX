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
                winston.format.timestamp(),
                winston.format.ms(),
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
                    return `${String(timestamp)} [${String((context as any) || 'Application')}] ${String(level)}: ${String(message)} ${trace_id ? `[Trace: ${String(trace_id as any)}]` : ''} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
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
