import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_FILTER } from '@nestjs/core';
import { TenantsModule } from './tenants/tenants.module';
import { AuthModule } from './auth/auth.module';
import { RequirementsModule } from './requirements/requirements.module';
import { SprintsModule } from './sprints/sprints.module';
import { TestKeysModule } from './test-keys/test-keys.module';
import { UsersModule } from './users/users.module';
import { BugsModule } from './bugs/bugs.module';
import { ReleasesModule } from './releases/releases.module';
import { MetricsModule } from './metrics/metrics.module';
import { TestAutomationModule } from './test-automation/test-automation.module';
import { BillingModule } from './billing/billing.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { ProjectsModule } from './projects/projects.module';
import { DemoModule } from './demo/demo.module';
import { FeedbackModule } from './feedback/feedback.module';
import { FeatureFlagsModule } from './feature-flags/feature-flags.module';
import { AuditModule } from './audit/audit.module';
import { ExportModule } from './export/export.module';
import { AiModule } from './ai/ai.module';
import { HealthModule } from './health/health.module';
import { SecurityOpsModule } from './security-ops/security-ops.module';
import { DocumentsModule } from './documents/documents.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TenantMiddleware } from './tenants/tenant.middleware';
import { RequestLoggerMiddleware } from './common/middleware/request-logger.middleware';
import { LoggerModule } from './common/logger/logger.module';
import { ClsModule } from 'nestjs-cls';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { EventStoreModule } from './common/event-store/event-store.module';
import { EventStorePublisher } from './common/event-store/event-store-publisher';
import { DomainEventPublisher } from './common/domain/domain-event.publisher';

@Module({
  imports: [
    ClsModule.forRoot({
      global: true,
      middleware: { mount: true, generateId: true },
    }),
    LoggerModule,
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        // Support both DATABASE_URL (Neon) and individual params (local)
        const databaseUrl = configService.get<string>('DATABASE_URL');

        if (databaseUrl) {
          // Neon / Production - use connection string
          return {
            type: 'postgres',
            url: databaseUrl,
            autoLoadEntities: true,
            synchronize: configService.get('NODE_ENV') !== 'production',
            ssl: databaseUrl.includes('neon.tech')
              ? { rejectUnauthorized: false }
              : false,
            extra: {
              // Connection pooling for Neon
              // Increased limits for long-running AI operations (up to 15s)
              max: 20,
              idleTimeoutMillis: 60000,
              connectionTimeoutMillis: 15000,
            },
          };
        }

        // Local development - use individual params
        return {
          type: 'postgres',
          host: configService.get<string>('DB_HOST', 'localhost'),
          port: configService.get<number>('DB_PORT', 5432),
          username: configService.get<string>('DB_USER', 'qanexus'),
          password: configService.get<string>(
            'DB_PASSWORD',
            'qanexus_dev_password',
          ),
          database: configService.get<string>('DB_NAME', 'qanexus'),
          autoLoadEntities: true,
          synchronize: true, // OK for local dev
          ssl: configService.get<string>('DB_SSL') === 'true',
          extra: {
            // Connection pooling for local development
            max: 20,
            idleTimeoutMillis: 60000,
            connectionTimeoutMillis: 15000,
          },
        };
      },
      inject: [ConfigService],
    }),
    EventStoreModule,
    HealthModule,
    AuthModule,
    UsersModule,
    TenantsModule,
    RequirementsModule,
    SprintsModule,
    TestKeysModule,
    AiModule,
    FeatureFlagsModule,
    FeedbackModule,
    TestAutomationModule,
    BugsModule,
    ReleasesModule,
    MetricsModule,
    BillingModule,
    OnboardingModule,
    ProjectsModule,
    DemoModule,
    AuditModule,
    ExportModule,
    SecurityOpsModule,
    DocumentsModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 60,
      },
    ]),
    ScheduleModule.forRoot(),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    DomainEventPublisher,
    EventStorePublisher,
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantMiddleware)
      .exclude('health', 'health/(.*)', 'api/auth/(.*)') // Exclude health check and auth
      .forRoutes('*');

    consumer.apply(RequestLoggerMiddleware).forRoutes('*');
  }
}
