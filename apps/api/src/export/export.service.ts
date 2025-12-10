import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Requirement } from '../requirements/requirement.entity';
import { Bug } from '../bugs/bug.entity';
// Import other entities as needed (Test, Release) if available and exported
// To avoid circular dependencies or massive imports, use Repository injection if entities are globally available
// For now, illustrating with Requirements and Bugs

@Injectable()
export class ExportService {
  constructor(
    @InjectRepository(Requirement)
    private requirementsRepo: Repository<Requirement>,
    @InjectRepository(Bug)
    private bugsRepo: Repository<Bug>,
  ) {}

  async exportAllJson(tenantId: string): Promise<any> {
    const requirements = await this.requirementsRepo.find({
      where: { tenantId },
    });
    const bugs = await this.bugsRepo.find({ where: { tenantId } });

    return {
      tenantId,
      exportedAt: new Date(),
      requirements,
      bugs,
      // tests: [],
      // releases: [],
    };
  }
}
