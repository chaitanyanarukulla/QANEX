import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AiProvider } from './ai.interface';
import { aiConfig } from '../config/ai.config';
import { PROMPTS } from './prompts';

@Injectable()
export class FoundryAiProvider implements AiProvider {
  private readonly logger = new Logger(FoundryAiProvider.name);
  private readonly apiUrl =
    process.env.LLM_API_ENDPOINT || 'https://api.openai.com/v1/chat/completions';
  private readonly apiKey = process.env.LLM_API_KEY || '';

  constructor(private httpService: HttpService) {}

  async analyzeRequirement(content: string): Promise<any> {
    const prompt = PROMPTS.ANALYZE_REQUIREMENT('Requirement', content, '');
    return this.callLlm(prompt, aiConfig.tasks.requirementAnalysis, 'ANALYZE_REQUIREMENT');
  }

  async triageBug(bugValues: { title: string; description: string }): Promise<any> {
    const prompt = PROMPTS.TRIAGE_BUG(bugValues.title, bugValues.description, '');
    return this.callLlm(prompt, aiConfig.tasks.bugTriage, 'TRIAGE_BUG');
  }

  async generateTestCode(
    testCase: { title: string; steps: any[] },
    framework: string,
  ): Promise<string> {
    const stepsStr = testCase.steps
      .map((s) => `- ${s.step} (Expect: ${s.expected})`)
      .join('\n');
    const prompt = PROMPTS.GENERATE_TEST_CODE(testCase.title, stepsStr, framework);

    // Return raw text, logged as CODE_GEN
    return this.callLlmRaw(prompt, aiConfig.tasks.codeGeneration, 'CODE_GEN');
  }

  async explainRcs(releaseInfo: { score: number; breakdown: any }): Promise<any> {
    const prompt = PROMPTS.EXPLAIN_RCS(
      releaseInfo.score,
      JSON.stringify(releaseInfo.breakdown, null, 2),
    );
    return this.callLlm(prompt, aiConfig.tasks.rcsExplanation, 'EXPLAIN_RCS');
  }

  private async callLlm(prompt: string, config: any, action: string): Promise<any> {
    try {
      const result = await this.callLlmRaw(prompt, config, action);
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
  ): Promise<string> {
    const startTime = Date.now();
    let success = true;

    if (!this.apiKey) {
      this.logger.warn('No API Key set for FoundryAiProvider. Returning Mock.');
      return 'Mock Response (No API Key)';
    }

    try {
      const payload = {
        model: config.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: config.temperature,
        max_tokens: config.maxTokens,
      };

      const response = await firstValueFrom(
        this.httpService.post(this.apiUrl, payload, {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }),
      );

      const content = response.data?.choices?.[0]?.message?.content;
      if (!content) throw new Error('Empty response from LLM');

      return content;
    } catch (error) {
      success = false;
      this.logger.error('LLM API Call failed', error);
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      this.logger.debug(`LLM call ${action} completed in ${duration}ms, success=${success}`);
    }
  }
}
