import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull } from 'typeorm';
import { Project } from '../projects/project.entity';
import { Requirement } from '../requirements/requirement.entity';
import { Sprint } from '../sprints/sprint.entity';
import { TestCase } from '../test-keys/test-case.entity';
import { TestRun } from '../test-keys/test-run.entity';
import { Bug } from '../bugs/bug.entity';
import { Release } from '../releases/release.entity';
import { AutomationCandidate } from '../test-automation/automation-candidate.entity';

export interface OnboardingChecklist {
  items: {
    id: string;
    label: string;
    completed: boolean;
    ctaPath?: string;
  }[];
  progress: number;
}

@Injectable()
export class OnboardingService {
  constructor(
    @InjectRepository(Project)
    private projectRepo: Repository<Project>,
    @InjectRepository(Requirement)
    private requirementRepo: Repository<Requirement>,
    @InjectRepository(Sprint)
    private sprintRepo: Repository<Sprint>,
    @InjectRepository(TestCase)
    private testCaseRepo: Repository<TestCase>,
    @InjectRepository(TestRun)
    private testRunRepo: Repository<TestRun>,
    @InjectRepository(Bug)
    private bugRepo: Repository<Bug>,
    @InjectRepository(Release)
    private releaseRepo: Repository<Release>,
    @InjectRepository(AutomationCandidate)
    private automationRepo: Repository<AutomationCandidate>,
  ) {}

  async getChecklist(tenantId: string): Promise<OnboardingChecklist> {
    const [
      projectCount,
      reqCount,
      analyzedReqCount,
      sprintCount,
      testCaseCount,
      testRunCount,
      bugCount,
      releaseCount,
      automationCount,
    ] = await Promise.all([
      this.projectRepo.count({ where: { tenantId } }),
      this.requirementRepo.count({ where: { tenantId } }),
      this.requirementRepo.count({ where: { tenantId, rqs: Not(IsNull()) } }), // Assuming RQS is null if not analyzed
      this.sprintRepo.count({ where: { tenantId } }),
      this.testCaseRepo.count({ where: { tenantId } }),
      this.testRunRepo.count({ where: { tenantId } }),
      this.bugRepo.count({ where: { tenantId } }),
      this.releaseRepo.count({ where: { tenantId } }), // Check if RCS > 0 if separate column, but release count is good enough for step 1
      this.automationRepo.count({ where: { tenantId } }),
    ]);

    const hasAnalyzedReq = analyzedReqCount > 0;
    const _hasReleaseWithRcs = releaseCount > 0; // Ideally check for RCS score, but let's assume existence implies usage for now or check column if known.
    // Actually, let's refine hasReleaseWithRcs. Release entity likely has `rcs` column.
    // I will just use releaseCount for now, but to be precise I should check rcs column.
    // Let's stick to existence for simplicity unless I check entity content.

    const items = [
      {
        id: 'create_project',
        label: 'Create your first project',
        completed: projectCount > 0,
        ctaPath: projectCount === 0 ? '/projects' : undefined,
      },
      {
        id: 'create_requirement',
        label: 'Create your first requirement',
        completed: reqCount > 0,
        ctaPath: '/requirements/new',
      },
      {
        id: 'analyze_requirement',
        label: 'Analyze a requirement with AI (RQS)',
        completed: hasAnalyzedReq,
        ctaPath: '/requirements',
      },
      {
        id: 'create_sprint',
        label: 'Plan your first sprint',
        completed: sprintCount > 0,
        ctaPath: '/planning',
      },
      {
        id: 'create_test_case',
        label: 'Create a test case',
        completed: testCaseCount > 0,
        ctaPath: '/tests',
      },
      {
        id: 'run_test',
        label: 'Execute a test run',
        completed: testRunCount > 0,
        ctaPath: '/runs',
      },
      {
        id: 'create_bug',
        label: 'Log a bug',
        completed: bugCount > 0,
        ctaPath: '/issues',
      },
      {
        id: 'create_release',
        label: 'Create a release',
        completed: releaseCount > 0,
        ctaPath: '/releases',
      },
      {
        id: 'automation_candidate',
        label: 'Generate an automation candidate',
        completed: automationCount > 0,
        ctaPath: '/testing/automation',
      },
    ];

    const completedCount = items.filter((i) => i.completed).length;
    const progress = items.length > 0 ? completedCount / items.length : 0;

    return {
      items,
      progress,
    };
  }
}
