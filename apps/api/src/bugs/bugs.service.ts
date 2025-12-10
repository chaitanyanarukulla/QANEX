import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bug, BugStatus, BugSeverity, BugPriority } from './bug.entity';
import { AiProviderFactory } from '../ai/ai-provider.factory';
import { RagService } from '../ai/rag.service';

@Injectable()
export class BugsService {
  private readonly logger = new Logger(BugsService.name);

  constructor(
    @InjectRepository(Bug)
    private bugsRepository: Repository<Bug>,
    private aiFactory: AiProviderFactory,
    private ragService: RagService,
  ) { }

  async create(data: Partial<Bug>, tenantId: string): Promise<Bug> {
    const bug = this.bugsRepository.create({ ...data, tenantId });
    const saved = await this.bugsRepository.save(bug);

    // Auto-Index
    this.ragService
      .indexBug(saved.id, tenantId, saved.title, saved.description || '')
      .catch((e) => this.logger.error('RAG Index failed', e));

    // Auto-Triage (Async)
    this.triage(saved.id, tenantId).catch((e) =>
      this.logger.error('AI Triage failed', e),
    );

    return saved;
  }

  async triage(id: string, tenantId: string) {
    const bug = await this.findOne(id, tenantId);
    const { provider } = await this.aiFactory.getProvider(tenantId);
    // Assuming aiProvider.triageBug returns { suggestedSeverity, suggestedPriority, ... }
    const suggestion = await provider.triageBug({
      title: bug.title,
      description: bug.description || '',
    }, tenantId);

    // Update bug with AI suggestions (could be separate columns, here treating as direct update for prototype)
    if (suggestion?.suggestedSeverity)
      bug.severity = suggestion.suggestedSeverity as BugSeverity;
    if (suggestion?.suggestedPriority)
      bug.priority = suggestion.suggestedPriority as BugPriority;

    await this.bugsRepository.save(bug);
  }

  async findAll(tenantId: string): Promise<Bug[]> {
    return this.bugsRepository.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, tenantId: string): Promise<Bug> {
    const bug = await this.bugsRepository.findOne({ where: { id, tenantId } });
    if (!bug) {
      throw new NotFoundException(`Bug ${id} not found`);
    }
    return bug;
  }

  async update(id: string, data: Partial<Bug>, tenantId: string): Promise<Bug> {
    await this.bugsRepository.update({ id, tenantId }, data);
    return this.findOne(id, tenantId);
  }

  async updateStatus(
    id: string,
    status: BugStatus,
    tenantId: string,
  ): Promise<Bug> {
    // Here we could add logic to Record transition history
    return this.update(id, { status }, tenantId);
  }

  async delete(id: string, tenantId: string): Promise<void> {
    const result = await this.bugsRepository.delete({ id, tenantId });
    if (result.affected === 0) {
      throw new NotFoundException(`Bug ${id} not found`);
    }
  }
}
