import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AiProvider } from './ai.interface';
import { PROMPTS } from './prompts';

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

  async analyzeRequirement(content: string): Promise<any> {
    const prompt = PROMPTS.ANALYZE_REQUIREMENT('Requirement', content, '');
    return this.callChat(prompt, this.gpt4Deployment, 'ANALYZE_REQUIREMENT', {
      maxTokens: 2000,
      temperature: 0.2,
    });
  }

  async triageBug(bugValues: { title: string; description: string }): Promise<any> {
    const prompt = PROMPTS.TRIAGE_BUG(
      bugValues.title,
      bugValues.description,
      '',
    );
    return this.callChat(prompt, this.gpt4Deployment, 'TRIAGE_BUG', {
      maxTokens: 1000,
      temperature: 0.1,
    });
  }

  async generateTestCode(
    testCase: { title: string; steps: any[] },
    framework: string,
  ): Promise<string> {
    const stepsStr = testCase.steps
      .map((s) => `- ${s.step} (Expect: ${s.expected})`)
      .join('\n');
    const prompt = PROMPTS.GENERATE_TEST_CODE(testCase.title, stepsStr, framework);
    return this.callChatRaw(prompt, this.gpt4Deployment, 'CODE_GEN', {
      maxTokens: 4000,
      temperature: 0.1,
    });
  }

  async explainRcs(releaseInfo: { score: number; breakdown: any }): Promise<any> {
    const prompt = PROMPTS.EXPLAIN_RCS(
      releaseInfo.score,
      JSON.stringify(releaseInfo.breakdown, null, 2),
    );
    return this.callChat(prompt, this.gpt4Deployment, 'EXPLAIN_RCS', {
      maxTokens: 1000,
      temperature: 0.7,
    });
  }

  /**
   * Generate embeddings using Azure OpenAI
   */
  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.isConfigured()) {
      throw new Error('Azure OpenAI not configured');
    }

    const url = `${this.endpoint}openai/deployments/${this.embeddingDeployment}/embeddings?api-version=${this.apiVersion}`;

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          url,
          { input: text },
          {
            headers: {
              'api-key': this.apiKey,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      return response.data?.data?.[0]?.embedding || [];
    } catch (error) {
      this.logger.error('Azure OpenAI embedding failed', error);
      throw error;
    }
  }

  /**
   * Check if Azure OpenAI is properly configured
   */
  isConfigured(): boolean {
    return !!(this.endpoint && this.apiKey);
  }

  private async callChat(
    prompt: string,
    deployment: string,
    action: string,
    options: { maxTokens: number; temperature: number },
  ): Promise<any> {
    try {
      const result = await this.callChatRaw(prompt, deployment, action, options);
      // Parse JSON from response
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
  ): Promise<string> {
    if (!this.isConfigured()) {
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
              'api-key': this.apiKey,
              'Content-Type': 'application/json',
            },
            timeout: 60000, // 60 second timeout
          },
        ),
      );

      const content = response.data?.choices?.[0]?.message?.content;
      if (!content) throw new Error('Empty response from Azure OpenAI');

      return content;
    } catch (error) {
      success = false;
      this.logger.error(`Azure OpenAI API call failed for ${action}`, error);
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      this.logger.debug(`Azure OpenAI call ${action} completed in ${duration}ms, success=${success}`);
    }
  }
}
