import { Injectable, Inject } from '@nestjs/common';
import { Bug } from './bug.entity';
import type { AiProvider } from '../ai/ai.interface';
import { AI_PROVIDER_TOKEN } from '../ai/ai.interface';

@Injectable()
export class BugTriageService {
  constructor(
    @Inject(AI_PROVIDER_TOKEN)
    private readonly aiProvider: AiProvider,
  ) {}

  async analyzeBug(bug: Bug): Promise<any> {
    return this.aiProvider.triageBug({
      title: bug.title,
      description: bug.description,
    });
  }
}
