import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AiProvider } from './ai.interface';
import { PROMPTS } from './prompts';
import { AiMetricsService } from '../metrics/ai-metrics.service';

interface AzureResponse {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Azure OpenAI Provider
 * Uses Azure's OpenAI service for AI capabilities
 *
 * Required environment variables:
 * - AZURE_OPENAI_ENDPOINT: https://your-resource.openai.azure.com/
 * - AZURE_OPENAI_API_KEY: Your API key
 * - AZURE_OPENAI_API_VERSION: 2024-02-15-preview
 * - AZURE_OPENAI_DEPLOYMENT_GPT4: Your GPT-4 deployment name
 * - AZURE_OPENAI_DEPLOYMENT_EMBEDDING: Your embedding deployment name
 */
@Injectable()
export class AzureOpenAiProvider implements AiProvider {
  private readonly logger = new Logger(AzureOpenAiProvider.name);
  private readonly endpoint: string;
  private readonly apiKey: string;
  private readonly apiVersion: string;
  private readonly gpt4Deployment: string;
  private readonly gpt4MiniDeployment: string;
  private readonly embeddingDeployment: string;

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
    private metricsService: AiMetricsService,
  ) {
    this.endpoint = this.configService.get('AZURE_OPENAI_ENDPOINT', '');
    this.apiKey = this.configService.get('AZURE_OPENAI_API_KEY', '');
    this.apiVersion = this.configService.get(
      'AZURE_OPENAI_API_VERSION',
      '2024-02-15-preview',
    );
    this.gpt4Deployment = this.configService.get(
      'AZURE_OPENAI_DEPLOYMENT_GPT4',
      'gpt-4',
    );
    this.gpt4MiniDeployment = this.configService.get(
      'AZURE_OPENAI_DEPLOYMENT_GPT4_MINI',
      'gpt-4o-mini',
    );
    this.embeddingDeployment = this.configService.get(
      'AZURE_OPENAI_DEPLOYMENT_EMBEDDING',
      'text-embedding-ada-002',
    );

    if (!this.endpoint || !this.apiKey) {
      this.logger.warn(
        'Azure OpenAI credentials not configured. AI features will be unavailable.',
      );
    }
  }

  async analyzeRequirement(content: string, tenantId: string, apiKey?: string): Promise<any> {
    const prompt = PROMPTS.ANALYZE_REQUIREMENT('Requirement', content, '');
    return this.callChatWithOptions(prompt, this.gpt4Deployment, 'ANALYZE_REQUIREMENT', {
      maxTokens: 2000,
      temperature: 0.2,
    }, tenantId, apiKey);
  }

  async triageBug(bugValues: {
    title: string;
    description: string;
  }, tenantId: string, apiKey?: string): Promise<any> {
    const prompt = PROMPTS.TRIAGE_BUG(
      bugValues.title,
      bugValues.description,
      '',
    );
    return this.callChatWithOptions(prompt, this.gpt4Deployment, 'TRIAGE_BUG', {
      maxTokens: 1000,
      temperature: 0.1,
    }, tenantId, apiKey);
  }

  async generateTestCode(
    testCase: { title: string; steps: any[] },
    framework: string,
    tenantId: string,
    apiKey?: string,
  ): Promise<string> {
    const stepsStr = testCase.steps
      .map((s: { step: string; expected: string }) => `- ${s.step} (Expect: ${s.expected})`)
      .join('\n');
    const prompt = PROMPTS.GENERATE_TEST_CODE(
      testCase.title,
      stepsStr,
      framework,
    );
    return this.callChatRaw(prompt, this.gpt4Deployment, 'CODE_GEN', {
      maxTokens: 4000,
      temperature: 0.1,
    }, tenantId, apiKey);
  }

  async callChat(
    prompt: string,
    tenantId: string, // tenantId is required by interface
    apiKey?: string,
  ): Promise<any> {
    try {
      const options = { maxTokens: 1000, temperature: 0.7 }; // Default options for generic chat
      const result = await this.callChatRaw(
        prompt,
        this.gpt4Deployment, // Default deployment
        'CHAT',
        options,
        tenantId,
        apiKey,
      );
      // Parse JSON
      const jsonStart = result.indexOf('{');
      const jsonEnd = result.lastIndexOf('}');
      if (jsonStart >= 0 && jsonEnd >= 0) {
        return JSON.parse(result.substring(jsonStart, jsonEnd + 1));
      }
      return result;
    } catch (e) {
      this.logger.error('Failed to parse Azure OpenAI JSON response', e);
      throw new Error('AI Response parsing failed');
    }
  }

  // Renaming old callChat to callChatInternal or similar if it was used internally with more options
  // Looking at the file, it seems the previous callChat was private and taken implementation details. 
  // But now it conflicts with the public interface method. 
  // I will introduce a private helper with rich options.

  private async callChatWithOptions(
    prompt: string,
    deployment: string,
    action: string,
    options: { maxTokens: number; temperature: number },
    tenantId: string,
    apiKey?: string,
  ): Promise<any> {
    try {
      const result = await this.callChatRaw(
        prompt,
        deployment,
        action,
        options,
        tenantId,
        apiKey,
      );
      // Parse JSON
      const jsonStart = result.indexOf('{');
      const jsonEnd = result.lastIndexOf('}');
      if (jsonStart >= 0 && jsonEnd >= 0) {
        return JSON.parse(result.substring(jsonStart, jsonEnd + 1));
      }
      return result;
    } catch (e) {
      this.logger.error('Failed to parse Azure OpenAI JSON response', e);
      throw new Error('AI Response parsing failed');
    }
  }

  private async callChatRaw(
    prompt: string,
    deployment: string,
    action: string,
    options: { maxTokens: number; temperature: number },
    tenantId: string,
    apiKey?: string,
  ): Promise<string> {
    const activeApiKey = apiKey || this.apiKey; // BYOK

    if (!this.endpoint || !activeApiKey) {
      this.logger.warn('Azure OpenAI not configured. Returning mock response.');
      return 'Mock Response (Azure OpenAI not configured)';
    }

    const startTime = Date.now();
    let success = true;

    const url = `${this.endpoint}openai/deployments/${deployment}/chat/completions?api-version=${this.apiVersion}`;

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          url,
          {
            messages: [{ role: 'user', content: prompt }],
            max_tokens: options.maxTokens,
            temperature: options.temperature,
          },
          {
            headers: {
              'api-key': activeApiKey,
              'Content-Type': 'application/json',
            },
            timeout: 60000,
          },
        ),
      );

      const data = response.data as AzureResponse;
      const content = data?.choices?.[0]?.message?.content;
      const usage = data?.usage;
      if (!content) throw new Error('Empty response from Azure OpenAI');

      const duration = Date.now() - startTime;
      const tokens = usage ? {
        prompt: usage.prompt_tokens,
        completion: usage.completion_tokens,
        total: usage.total_tokens
      } : undefined;

      await this.metricsService.logUsage(tenantId, action, 'AZURE', deployment, duration, tokens, true);

      return content;
    } catch (error) {
      // ... error handling
      success = false;
      const duration = Date.now() - startTime;
      await this.metricsService.logUsage(tenantId, action, 'AZURE', deployment, duration, undefined, false);
      this.logger.error(`Azure OpenAI API call failed for ${action}`, error);
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      this.logger.debug(
        `Azure OpenAI call ${action} completed in ${duration}ms, success=${success}`,
      );
    }
  }
}
