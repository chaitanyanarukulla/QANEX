import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Release, ReleaseStatus } from './release.entity';
import { Release as ReleaseAggregate } from './domain/release.aggregate';
import { EventStorePublisher } from '../common/event-store/event-store-publisher';
import { DomainEventPublisher } from '../common/domain/domain-event.publisher';

@Injectable()
export class ReleasesService {
  constructor(
    @InjectRepository(Release)
    private releasesRepository: Repository<Release>,
    private readonly eventStorePublisher: EventStorePublisher,
    private readonly eventPublisher: DomainEventPublisher,
  ) {}

  async create(
    version: string,
    tenantId: string,
    env: string = 'staging',
    userId?: string,
  ): Promise<Release> {
    // Step 1: Create aggregate (validates inputs and semantic versioning)
    const aggregate = ReleaseAggregate.create({
      id: '', // Will be set by repository
      tenantId,
      version,
      environment: env,
      userId,
    });

    // Step 2: Save entity (backward compatibility)
    const releaseData = this.releasesRepository.create({
      version,
      tenantId,
      env,
      status: ReleaseStatus.PLANNED,
    });
    const saved = await this.releasesRepository.save(releaseData);

    // Step 3: Update aggregate with generated ID
    aggregate.id = saved.id;

    // Step 4: Publish events (auto-persisted to EventStore)
    await this.eventStorePublisher.publishAll(
      aggregate.getDomainEvents(),
      tenantId,
    );
    aggregate.clearDomainEvents();

    return saved;
  }

  async findAll(tenantId: string): Promise<Release[]> {
    return this.releasesRepository.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, tenantId: string): Promise<Release> {
    const release = await this.releasesRepository.findOne({
      where: { id, tenantId },
    });
    if (!release) {
      throw new NotFoundException(`Release ${id} not found`);
    }
    return release;
  }

  async update(
    id: string,
    data: Partial<Release>,
    tenantId: string,
  ): Promise<Release> {
    await this.releasesRepository.update({ id, tenantId }, data);
    return this.findOne(id, tenantId);
  }

  async evaluateReadiness(
    id: string,
    tenantId: string,
    readinessData: any,
    _userId?: string,
  ): Promise<Release> {
    // Step 1: Fetch and reconstruct aggregate
    const release = await this.findOne(id, tenantId);
    const aggregate = this.reconstructAggregate(release);

    // Step 2: Apply domain logic (evaluates all gates and publishes events)
    aggregate.evaluateReadiness(readinessData);

    // Step 3: Update entity with readiness status
    release.status = ReleaseStatus.ACTIVE;
    const saved = await this.releasesRepository.save(release);

    // Step 4: Publish events (auto-persisted to EventStore)
    await this.eventStorePublisher.publishAll(
      aggregate.getDomainEvents(),
      tenantId,
    );
    aggregate.clearDomainEvents();

    return saved;
  }

  async activate(
    id: string,
    tenantId: string,
    userId?: string,
  ): Promise<Release> {
    // Step 1: Fetch and reconstruct aggregate
    const release = await this.findOne(id, tenantId);
    const aggregate = this.reconstructAggregate(release);

    // Step 2: Apply domain logic (transitions to ACTIVE)
    aggregate.activate(userId);

    // Step 3: Update entity
    release.status = ReleaseStatus.ACTIVE;
    const saved = await this.releasesRepository.save(release);

    // Step 4: Publish events (auto-persisted to EventStore)
    await this.eventStorePublisher.publishAll(
      aggregate.getDomainEvents(),
      tenantId,
    );
    aggregate.clearDomainEvents();

    return saved;
  }

  async block(
    id: string,
    tenantId: string,
    reason: string,
    userId?: string,
  ): Promise<Release> {
    // Step 1: Fetch and reconstruct aggregate
    const release = await this.findOne(id, tenantId);
    const aggregate = this.reconstructAggregate(release);

    // Step 2: Apply domain logic (validates can be blocked)
    aggregate.block(reason, userId);

    // Step 3: Update entity (keep existing status for backward compatibility)
    // Note: Status change tracked in aggregate and event, entity remains ACTIVE
    const saved = await this.releasesRepository.save(release);

    // Step 4: Publish events (auto-persisted to EventStore)
    await this.eventStorePublisher.publishAll(
      aggregate.getDomainEvents(),
      tenantId,
    );
    aggregate.clearDomainEvents();

    return saved;
  }

  // Helper to save RCS calculation
  async updateScore(
    id: string,
    score: number,
    breakdown: {
      rp: number;
      qt: number;
      b: number;
      so: number;
      details: any;
    },
  ): Promise<void> {
    await this.releasesRepository.update(id, {
      rcsScore: score,
      rcsBreakdown: breakdown,
    });
  }

  // Helper to save RCS AI explanation
  async updateExplanation(
    id: string,
    explanation: { summary: string; risks: string[]; strengths: string[] },
  ): Promise<void> {
    await this.releasesRepository.update(id, {
      rcsExplanation: {
        ...explanation,
        generatedAt: new Date().toISOString(),
      },
    });
  }

  /**
   * Reconstruct Release aggregate from entity
   * Used to apply domain logic to existing releases
   * Bridges between persistent entity and domain model
   *
   * @private
   */
  private reconstructAggregate(entity: Release): ReleaseAggregate {
    // Create a new aggregate instance directly
    const aggregate = new ReleaseAggregate(
      entity.id,
      entity.tenantId,
      entity.version,
      entity.env,
      (entity.status as any) || 'PLANNED',
    );
    aggregate.createdAt = entity.createdAt;
    aggregate.updatedAt = entity.updatedAt;
    return aggregate;
  }
}
