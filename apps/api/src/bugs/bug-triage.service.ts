import { Injectable } from '@nestjs/common';
import { Bug } from './bug.entity';
import { AiProviderFactory } from '../ai/ai-provider.factory';

@Injectable()
export class BugTriageService {
  constructor(private readonly aiFactory: AiProviderFactory) {}

  async analyzeBug(bug: Bug): Promise<any> {
    const { provider, config } = await this.aiFactory.getProvider(bug.tenantId);
    return provider.triageBug(
      {
        title: bug.title,
        description: bug.description,
      },
      bug.tenantId,
      config.apiKey,
    );
  }
}
