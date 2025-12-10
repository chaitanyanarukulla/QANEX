import { Injectable } from '@nestjs/common';
import { Bug } from './bug.entity';
import { AiProviderFactory } from '../ai/providers';

@Injectable()
export class BugTriageService {
  constructor(private readonly aiFactory: AiProviderFactory) {}

  async analyzeBug(bug: Bug): Promise<any> {
    const { provider } = await this.aiFactory.getProvider(bug.tenantId);
    return provider.triageBug(bug.title, bug.description);
  }
}
