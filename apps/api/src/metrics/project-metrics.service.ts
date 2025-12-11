import { Injectable } from '@nestjs/common';
import { RequirementsService } from '../requirements/requirements.service';
import { BugsService } from '../bugs/bugs.service';
import { BugStatus } from '../bugs/bug.entity';
import { TestKeysService } from '../test-keys/test-keys.service';

@Injectable()
export class ProjectMetricsService {
  constructor(
    private requirementsService: RequirementsService,
    private bugsService: BugsService,
    private testKeysService: TestKeysService,
  ) {}

  async getProjectStats(tenantId: string) {
    const reqs = await this.requirementsService.findAll(tenantId);
    const bugs = await this.bugsService.findAll(tenantId);

    // Avg RQS
    const scoredReqs = reqs.filter(
      (r) => r.rqs !== null && r.rqs !== undefined,
    );
    const avgRqs =
      scoredReqs.length > 0
        ? scoredReqs.reduce((sum, r) => sum + (r.rqs?.score || 0), 0) /
          scoredReqs.length
        : 0;

    // Bug Density (Mock: Bugs per Requirement)
    const bugDensity =
      reqs.length > 0 ? (bugs.length / reqs.length).toFixed(2) : 0;

    // Test Pass Rate
    const testPassRate = await this.testKeysService.getLatestPassRate(tenantId);

    return {
      totalRequirements: reqs.length,
      avgRqs: Math.round(avgRqs),
      totalBugs: bugs.length,
      bugDensity,
      openBugs: bugs.filter(
        (b) => b.status !== BugStatus.RESOLVED && b.status !== BugStatus.CLOSED,
      ).length,
      testPassRate,
    };
  }
}
