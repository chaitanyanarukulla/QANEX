import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Release, ReleaseStatus } from './release.entity';

@Injectable()
export class ReleasesService {
  constructor(
    @InjectRepository(Release)
    private releasesRepository: Repository<Release>,
  ) {}

  async create(
    version: string,
    tenantId: string,
    env: string = 'staging',
  ): Promise<Release> {
    const release = this.releasesRepository.create({
      version,
      tenantId,
      env,
      status: ReleaseStatus.PLANNED,
    });
    return this.releasesRepository.save(release);
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

  // Helper to save RCS calculation
  async updateScore(id: string, score: number, breakdown: any): Promise<void> {
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
}
