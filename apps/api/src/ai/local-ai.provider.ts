import { Injectable, Logger } from '@nestjs/common';
import { AiProvider } from './ai.interface';
import { LocalModelGateway } from './local-model.gateway';
import { RagService } from './rag.service';
import { aiConfig } from '../config/ai.config';

@Injectable()
export class LocalAiProvider implements AiProvider {
  private readonly logger = new Logger(LocalAiProvider.name);

  constructor(
    private readonly localModelGateway: LocalModelGateway,
    private readonly ragService: RagService,
  ) {}

  async analyzeRequirement(content: string): Promise<{
    score: number;
    clarity: number;
    completeness: number;
    testability: number;
    consistency: number;
    feedback: string[];
  }> {
    const prompt = `
        Analyze the following software requirement for clarity, completeness, testability, and consistency.
        Provide a score from 0-100 and a list of specific feedback points.

        Requirement:
        "${content}"

        Return ONLY a JSON object with this structure:
        {
            "score": number,
            "clarity": number,
            "completeness": number,
            "testability": number,
            "consistency": number,
            "feedback": ["string", "string"]
        }
        `;

    try {
      const result = await this.localModelGateway.complete({
        model: 'llama3:instruct',
        prompt: prompt,
        maxTokens: aiConfig.tasks.requirementAnalysis.maxTokens,
        temperature: aiConfig.tasks.requirementAnalysis.temperature,
      });

      return JSON.parse(result);
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error('Failed to analyze requirement locally', err.stack);
      return {
        score: 0,
        clarity: 0,
        completeness: 0,
        testability: 0,
        consistency: 0,
        feedback: ['Local AI analysis failed. Please check local model status.'],
      };
    }
  }

  async triageBug(bugValues: { title: string; description: string }): Promise<{
    suggestedSeverity: string;
    suggestedPriority: string;
    duplicateCandidates: string[];
    rootCauseHypothesis: string;
  }> {
    const prompt = `
        Triage the following bug report. Suggest severity (Low, Medium, High, Critical) and priority (Low, Medium, High, Critical).
        Hypothesize a root cause based on the description.

        Title: ${bugValues.title}
        Description: ${bugValues.description}

        Return ONLY a JSON object with this structure:
        {
            "suggestedSeverity": "string",
            "suggestedPriority": "string",
            "duplicateCandidates": [],
            "rootCauseHypothesis": "string"
        }
        `;

    try {
      const result = await this.localModelGateway.complete({
        model: 'llama3:instruct',
        prompt: prompt,
        maxTokens: aiConfig.tasks.bugTriage.maxTokens,
        temperature: aiConfig.tasks.bugTriage.temperature,
      });

      return JSON.parse(result);
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error('Failed to triage bug locally', err.stack);
      return {
        suggestedSeverity: 'Medium',
        suggestedPriority: 'Medium',
        duplicateCandidates: [],
        rootCauseHypothesis: 'Local AI analysis failed.',
      };
    }
  }

  async generateTestCode(
    testCase: { title: string; steps: any[] },
    framework: string,
  ): Promise<string> {
    const prompt = `
        Generate ${framework} test code for the following test case.

        Title: ${testCase.title}
        Steps: ${JSON.stringify(testCase.steps)}

        Return only the code block.
        `;

    try {
      return await this.localModelGateway.complete({
        model: 'llama3:instruct',
        prompt: prompt,
        maxTokens: aiConfig.tasks.codeGeneration.maxTokens,
        temperature: aiConfig.tasks.codeGeneration.temperature,
      });
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error('Failed to generate test code locally', err.stack);
      return '// Local AI generation failed.';
    }
  }
}
