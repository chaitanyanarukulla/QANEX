import { Logger } from '@nestjs/common';

const logger = new Logger('EnvValidation');

interface EnvConfig {
  required: string[];
  optional: string[];
}

const envConfig: EnvConfig = {
  required: ['DATABASE_URL', 'JWT_SECRET'],
  optional: [
    'NODE_ENV',
    'PORT',
    'AI_PROVIDER',
    'CORS_ORIGINS',
    'AZURE_OPENAI_ENDPOINT',
    'AZURE_OPENAI_API_KEY',
    'AZURE_OPENAI_API_VERSION',
    'AZURE_OPENAI_DEPLOYMENT_GPT4',
    'AZURE_OPENAI_DEPLOYMENT_EMBEDDING',
  ],
};

export function validateEnv(): void {
  const missing: string[] = [];
  const present: string[] = [];

  logger.log('Validating environment variables...');

  for (const key of envConfig.required) {
    if (!process.env[key]) {
      missing.push(key);
    } else {
      present.push(key);
    }
  }

  // Log present required vars
  for (const key of present) {
    const value = process.env[key];
    const masked =
      key.includes('SECRET') || key.includes('KEY') || key.includes('PASSWORD')
        ? '***'
        : value?.substring(0, 30) + (value && value.length > 30 ? '...' : '');
    logger.log(`✓ ${key}: ${masked}`);
  }

  // Log optional vars
  for (const key of envConfig.optional) {
    if (process.env[key]) {
      logger.log(`○ ${key}: configured`);
    }
  }

  if (missing.length > 0) {
    logger.error('='.repeat(60));
    logger.error('MISSING REQUIRED ENVIRONMENT VARIABLES:');
    for (const key of missing) {
      logger.error(`  ✗ ${key}`);
    }
    logger.error('='.repeat(60));
    logger.error('Please set these variables in Railway:');
    logger.error('  Railway Dashboard → Your Project → Variables');
    logger.error('');
    logger.error('Required variables:');
    logger.error(
      '  DATABASE_URL=postgresql://user:pass@host/db?sslmode=require',
    );
    logger.error('  JWT_SECRET=your-secure-secret-here');
    logger.error('='.repeat(60));

    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`,
    );
  }

  logger.log('Environment validation passed ✓');
}
