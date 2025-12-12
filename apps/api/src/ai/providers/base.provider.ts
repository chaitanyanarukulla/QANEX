import { Logger } from '@nestjs/common';
import {
  AiProvider,
  ChatMessage,
  ChatCompletionOptions,
  ChatCompletionResult,
  EmbeddingOptions,
  EmbeddingResult,
  RequirementAnalysis,
  BugTriageResult,
  RcsExplanation,
  ConnectionTestResult,
  ProviderType,
  ModelInfo,
  FoundryLocalModelInfo,
} from './ai-provider.types';
import { PROMPTS } from '../prompts';

/**
 * Base AI Provider class with common functionality
 * All providers extend this class
 */
export abstract class BaseAiProvider implements AiProvider {
  protected readonly logger: Logger;

  abstract readonly providerType: ProviderType;
  abstract readonly providerName: string;
  abstract readonly supportsEmbeddings: boolean;

  constructor(loggerContext: string) {
    this.logger = new Logger(loggerContext);
  }

  // Abstract methods that must be implemented by each provider
  abstract chat(
    messages: ChatMessage[],
    options?: ChatCompletionOptions,
    apiKey?: string,
  ): Promise<ChatCompletionResult>;

  abstract embed(
    texts: string[],
    options?: EmbeddingOptions,
  ): Promise<EmbeddingResult>;

  abstract testConnection(): Promise<ConnectionTestResult>;

  abstract getAvailableModels(): ModelInfo[] | FoundryLocalModelInfo[];

  /**
   * Simple completion method - wraps chat with single user message
   */
  async complete(
    prompt: string,
    options?: ChatCompletionOptions,
  ): Promise<string> {
    const messages: ChatMessage[] = [];

    if (options?.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }

    messages.push({ role: 'user', content: prompt });

    const result = await this.chat(messages, options);
    return result.content;
  }

  /**
   * Analyze a requirement for quality metrics
   */
  async analyzeRequirement(
    content: string,
    context?: string,
  ): Promise<RequirementAnalysis> {
    const prompt = PROMPTS.ANALYZE_REQUIREMENT(
      'Requirement',
      content,
      context || '',
    );

    // try {
    const response = await this.complete(prompt, {
      temperature: 0.2,
      maxTokens: 2000,
      responseFormat: 'json',
    });

    return this.parseJsonResponse<RequirementAnalysis>(response, {
      score: 50,
      clarity: 50,
      completeness: 50,
      testability: 50,
      consistency: 50,
      feedback: ['Unable to fully analyze requirement'],
    });
    // } catch (error) {
    //   this.logger.error('Failed to analyze requirement', error);
    //   throw error; // Rethrow to let the controller handle it
    // }
  }

  /**
   * Triage a bug report
   */
  async triageBug(
    title: string,
    description: string,
    relatedContext?: string,
  ): Promise<BugTriageResult> {
    const prompt = PROMPTS.TRIAGE_BUG(title, description, relatedContext || '');

    try {
      const response = await this.complete(prompt, {
        temperature: 0.1,
        maxTokens: 1000,
        responseFormat: 'json',
      });

      return this.parseJsonResponse<BugTriageResult>(response, {
        suggestedSeverity: 'MEDIUM',
        suggestedPriority: 'P2',
        duplicateCandidates: [],
        rootCauseHypothesis: 'Unable to determine root cause',
      });
    } catch (error) {
      this.logger.error('Failed to triage bug', error);
      return {
        suggestedSeverity: 'MEDIUM',
        suggestedPriority: 'P2',
        duplicateCandidates: [],
        rootCauseHypothesis: 'AI triage failed. Please review manually.',
      };
    }
  }

  /**
   * Generate test code for a test case
   */
  async generateTestCode(
    testCase: { title: string; steps: { step: string; expected: string }[] },
    framework: string,
  ): Promise<string> {
    const stepsStr = testCase.steps
      .map((s) => `- ${s.step} (Expect: ${s.expected})`)
      .join('\n');

    const prompt = PROMPTS.GENERATE_TEST_CODE(
      testCase.title,
      stepsStr,
      framework,
    );

    try {
      const response = await this.complete(prompt, {
        temperature: 0.1,
        maxTokens: 4000,
      });

      // Clean up code block markers if present
      return this.extractCodeBlock(response);
    } catch (error) {
      this.logger.error('Failed to generate test code', error);
      return `// Test code generation failed\n// Test: ${testCase.title}\n// Please implement manually`;
    }
  }

  /**
   * Explain a Release Confidence Score
   */
  async explainRcs(
    score: number,
    breakdown: Record<string, number>,
  ): Promise<RcsExplanation> {
    const prompt = PROMPTS.EXPLAIN_RCS(
      score,
      JSON.stringify(breakdown, null, 2),
    );

    try {
      const response = await this.complete(prompt, {
        temperature: 0.7,
        maxTokens: 1000,
        responseFormat: 'json',
      });

      return this.parseJsonResponse<RcsExplanation>(response, {
        summary: `Release score is ${score}/100.`,
        risks: [],
        strengths: [],
      });
    } catch (error) {
      this.logger.error('Failed to explain RCS', error);
      return {
        summary: `Release Confidence Score: ${score}/100`,
        risks: ['Unable to generate detailed analysis'],
        strengths: [],
      };
    }
  }

  /**
   * Parse JSON from AI response, handling common issues
   */
  protected parseJsonResponse<T>(response: string, fallback: T): T {
    try {
      // Try to find JSON in the response
      const jsonStart = response.indexOf('{');
      const jsonEnd = response.lastIndexOf('}');

      if (jsonStart >= 0 && jsonEnd > jsonStart) {
        const jsonStr = response.substring(jsonStart, jsonEnd + 1);
        return JSON.parse(jsonStr) as T;
      }

      // Try parsing the whole response
      return JSON.parse(response) as T;
    } catch {
      this.logger.warn('Failed to parse JSON response, using fallback');
      return fallback;
    }
  }

  /**
   * Extract code from markdown code blocks
   */
  protected extractCodeBlock(response: string): string {
    // Remove markdown code fences
    const codeBlockMatch = response.match(/```(?:\w+)?\n?([\s\S]*?)```/);
    if (codeBlockMatch) {
      return codeBlockMatch[1].trim();
    }
    return response.trim();
  }

  /**
   * Build messages array with optional system prompt
   */
  protected buildMessages(
    prompt: string,
    systemPrompt?: string,
  ): ChatMessage[] {
    const messages: ChatMessage[] = [];

    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }

    messages.push({ role: 'user', content: prompt });

    return messages;
  }
}
