import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { AiProvider } from './ai.interface';
import { aiConfig } from '../config/ai.config';
import { PROMPTS } from './prompts';
import { PiiRedactionService } from './pii-redaction.service';
import { AiMetricsService } from '../metrics/ai-metrics.service';

@Injectable()
export class FoundryAiProvider implements AiProvider {
  private readonly logger = new Logger(FoundryAiProvider.name);
  private readonly apiUrl =
    process.env.LLM_API_ENDPOINT ||
    'https://api.openai.com/v1/chat/completions';
  private readonly apiKey = process.env.LLM_API_KEY || '';

  constructor(
    private httpService: HttpService,
    private readonly piiService: PiiRedactionService,
    private readonly metricsService: AiMetricsService, // Inject Metrics
  ) { }

  async analyzeRequirement(content: string, tenantId: string, apiKey?: string): Promise<any> {
    const prompt = PROMPTS.ANALYZE_REQUIREMENT('Requirement', content, '');
    return this.callLlmRaw(prompt, aiConfig.tasks.requirementAnalysis, 'ANALYZE_REQUIREMENT', tenantId, apiKey);
  }

  async triageBug(
    bugValues: {
      title: string;
      description: string;
    },
    tenantId: string,
    apiKey?: string,
  ): Promise<any> {
    const prompt = PROMPTS.TRIAGE_BUG(
      bugValues.title,
      bugValues.description,
      '',
    );
    return this.callLlm(prompt, aiConfig.tasks.bugTriage, 'TRIAGE_BUG', tenantId, apiKey);
  }

  async generateTestCode(
    testCase: { title: string; steps: any[] },
    framework: string,
    tenantId: string,
    apiKey?: string,
  ): Promise<string> {
    const stepsStr = testCase.steps
      .map((s) => `- ${s.step} (Expect: ${s.expected})`)
      .join('\n');
    const prompt = PROMPTS.GENERATE_TEST_CODE(
      testCase.title,
      stepsStr,
      framework,
    );

    // Return raw text, logged as CODE_GEN
    return this.callLlmRaw(prompt, aiConfig.tasks.codeGeneration, 'CODE_GEN', tenantId, apiKey);
  }

  async callChat(prompt: string, tenantId: string, apiKey?: string): Promise<string> {
    return this.callLlmRaw(prompt, { model: 'gpt-4', temperature: 0.7, maxTokens: 1000 }, 'CHAT', tenantId, apiKey);
  }

  async explainRcs(releaseInfo: {
    score: number;
    breakdown: any;
  }): Promise<any> {
    // Note: explainRcs doesn't take tenantId in interface yet, but it should. 
    // For now passing empty or handle error.
    // In fact, interface says explainRcs is optional, but implementation has it. 
    // Let's keep it but it might fail metrics if no tenantId.
    // I'll leave it as is for now or use a placeholder.
    const prompt = PROMPTS.EXPLAIN_RCS(
      releaseInfo.score,
      JSON.stringify(releaseInfo.breakdown, null, 2),
    );
    // TODO: Need tenantId here
    return this.callLlm(prompt, aiConfig.tasks.rcsExplanation, 'EXPLAIN_RCS', 'UNKNOWN');
  }

  private async callLlm(
    prompt: string,
    config: any,
    action: string,
    tenantId: string,
    apiKey?: string,
  ): Promise<any> {
    try {
      const result = await this.callLlmRaw(prompt, config, action, tenantId, apiKey);
      // Attempt to parse JSON
      const jsonStart = result.indexOf('{');
      const jsonEnd = result.lastIndexOf('}');
      if (jsonStart >= 0 && jsonEnd >= 0) {
        return JSON.parse(result.substring(jsonStart, jsonEnd + 1));
      }
      return result;
    } catch (e) {
      this.logger.error('Failed to parse LLM JSON', e);
      throw new Error('AI Response parsing failed');
    }
  }

  private async callLlmRaw(
    prompt: string,
    config: any,
    action: string,
    tenantId: string,
    apiKey?: string,
  ): Promise<string> {
    // Prioritize Tenant Key (BYOK), then fallback to System Key
    const activeApiKey = apiKey || this.apiKey;

    if (!activeApiKey) {
      if (process.env.NODE_ENV !== 'production') {
        const duration = Date.now() - Date.now(); // Mock 0ms
        this.logger.log({
          action,
          duration,
          model: 'mock-model',
          mock: true,
          success: true,
        });
        return 'Mock Response (No API Key)';
      }
      throw new Error('LLM API Key is missing');
    }

    let success = true;
    const startTime = Date.now();

    try {
      const sanitizedPrompt = this.piiService.redact(prompt);
      const payload = {
        model: (config as any).model,
        messages: [{ role: 'user', content: sanitizedPrompt }],
        temperature: (config as any).temperature,
        max_tokens: (config as any).maxTokens,
      };

      const response = await lastValueFrom(
        this.httpService.post(this.apiUrl, payload, {
          headers: {
            'Content-Type': 'application/json',
            'api-key': activeApiKey,
          },
          timeout: 30000,
        }),
      );

      const content = response.data?.choices?.[0]?.message?.content;
      const usage = response.data?.usage;

      if (!content) throw new Error('Empty response from LLM');

      const duration = Date.now() - startTime;

      const tokens = usage ? {
        prompt: usage.prompt_tokens,
        completion: usage.completion_tokens,
        total: usage.total_tokens
      } : undefined;

      await this.metricsService.logUsage(tenantId, action, 'FOUNDRY', (config as any).model, duration, tokens, true);

      return content;
    } catch (error) {
      success = false;
      const duration = Date.now() - startTime;
      await this.metricsService.logUsage(tenantId, action, 'FOUNDRY', (config as any).model, duration, undefined, false);

      this.logger.error({
        action,
        duration,
        model: (config as any).model,
        success: false,
        error: (error as Error).message,
      });
      throw error;
    }
  }
}
