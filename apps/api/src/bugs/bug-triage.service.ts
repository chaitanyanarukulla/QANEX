import { Injectable, Inject } from '@nestjs/common';
import { Bug, BugSeverity, BugPriority } from './bug.entity';
import { AiProvider, AI_PROVIDER_TOKEN } from '../ai/ai.interface';

@Injectable()
@Injectable()
export class BugTriageService {
    constructor(
        @Inject(AI_PROVIDER_TOKEN)
        private readonly aiProvider: AiProvider
    ) { }

    async analyzeBug(bug: Bug): Promise<any> {
        return this.aiProvider.triageBug({
            title: bug.title,
            description: bug.description
        });
    }
}
