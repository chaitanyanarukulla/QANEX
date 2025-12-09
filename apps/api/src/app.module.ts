import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
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
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TenantMiddleware } from './tenants/tenant.middleware';
import { RequestLoggerMiddleware } from './common/middleware/request-logger.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        // Support both DATABASE_URL (Neon) and individual params (local)
        const databaseUrl = configService.get('DATABASE_URL');

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
              max: 10,
              idleTimeoutMillis: 30000,
              connectionTimeoutMillis: 10000,
            },
          };
        }

        // Local development - use individual params
        return {
          type: 'postgres',
          host: configService.get('DB_HOST', 'localhost'),
          port: configService.get('DB_PORT', 5432),
          username: configService.get('DB_USER', 'qanexus'),
          password: configService.get('DB_PASSWORD', 'qanexus_dev_password'),
          database: configService.get('DB_NAME', 'qanexus'),
          autoLoadEntities: true,
          synchronize: true, // OK for local dev
          ssl: configService.get('DB_SSL') === 'true',
        };
      },
      inject: [ConfigService],
    }),
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
  ],
  controllers: [AppController],
  providers: [AppService],
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
