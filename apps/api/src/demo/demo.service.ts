import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../projects/project.entity';
import {
  Requirement,
  RequirementState,
} from '../requirements/requirement.entity';
import { Sprint, SprintStatus } from '../sprints/sprint.entity';
import { TestCase } from '../test-keys/test-case.entity';
import { TestRun } from '../test-keys/test-run.entity';
import { Bug, BugPriority, BugSeverity, BugStatus } from '../bugs/bug.entity';
import { Release, ReleaseStatus } from '../releases/release.entity';
import { AiLog } from '../metrics/ai-log.entity';

@Injectable()
export class DemoService {
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
    @InjectRepository(AiLog)
    private aiLogRepo: Repository<AiLog>,
  ) {}

  async createDemoProject(tenantId: string) {
    // 1. Create Project
    const project = this.projectRepo.create({
      name: 'Demo Project',
      description: 'A sandbox project to explore TraceGate features.',
      tenantId,
      isDemo: true,
    });
    await this.projectRepo.save(project);

    // 2. Create Requirements
    const reqs = [
      {
        title: 'User Authentication',
        content: 'Users must be able to log in with email and password.',
        state: RequirementState.READY,
        rqs: {
          score: 90,
          clarity: 95,
          completeness: 85,
          testability: 90,
          consistency: 90,
          feedback: [],
        },
      },
      {
        title: 'Product Search',
        content: 'Users should be able to search for products by keyword.',
        state: RequirementState.DRAFT,
        rqs: undefined,
      },
      {
        title: 'Checkout Flow',
        content: 'The checkout process must support credit card payments.',
        state: RequirementState.NEEDS_REVISION,
        rqs: {
          score: 45,
          clarity: 50,
          completeness: 40,
          testability: 45,
          consistency: 50,
          feedback: ['Ambiguous payment gateway details'],
        },
      },
      {
        title: 'User Profile',
        content: 'Users can update their profile picture.',
        state: RequirementState.READY,
        rqs: {
          score: 85,
          clarity: 90,
          completeness: 80,
          testability: 85,
          consistency: 85,
          feedback: [],
        },
      },
    ];

    const savedReqs: Requirement[] = [];
    for (const r of reqs) {
      const req = this.requirementRepo.create({
        ...r,
        tenantId,
        // projectId: project.id // Future proofing if property existed, currently implies tenant scope + isDemo checks
      });
      savedReqs.push(await this.requirementRepo.save(req));
    }

    // 3. Create Sprints
    const sprints = [
      { name: 'Sprint 1', status: SprintStatus.COMPLETED, capacity: 20 },
      { name: 'Sprint 2', status: SprintStatus.ACTIVE, capacity: 25 },
    ];

    for (const s of sprints) {
      await this.sprintRepo.save(this.sprintRepo.create({ ...s, tenantId }));
    }

    // 4. Create Bugs
    const bugs = [
      {
        title: 'Login fails on Safari',
        description: 'Clicking login button does nothing.',
        severity: BugSeverity.HIGH,
        priority: BugPriority.P1,
        status: BugStatus.NEW,
        requirementId: savedReqs[0].id,
      },
      {
        title: 'Typo in Checkout',
        description: 'Label says "Paymeny"',
        severity: BugSeverity.LOW,
        priority: BugPriority.P3,
        status: BugStatus.RESOLVED,
        requirementId: savedReqs[2].id,
      },
    ];

    for (const b of bugs) {
      await this.bugRepo.save(
        this.bugRepo.create({ ...b, tenantId: tenantId }),
      );
    }

    // 5. Create Test Cases & Runs
    // ... (Simplified for brevity, assuming standard fields)
    const testCase = this.testCaseRepo.create({
      title: 'Verify Login Success',
      // description: 'Enter valid credentials and check redirection.', // Removed as column doesn't exist
      tenantId,
    });
    await this.testCaseRepo.save(testCase);

    // 6. Create Release
    const release = this.releaseRepo.create({
      version: 'v1.0.0-demo',
      status: ReleaseStatus.PLANNED,
      tenantId,
      rcsScore: 88,
    });
    await this.releaseRepo.save(release);

    // 7. Synthetic AI Logs
    const logs = [
      {
        action: 'ANALYZE_REQ',
        provider: 'FOUNDRY',
        latencyMs: 1200,
        success: true,
        model: 'gpt-4o',
      },
      {
        action: 'GENERATE_TESTS',
        provider: 'FOUNDRY',
        latencyMs: 2500,
        success: true,
        model: 'gpt-4o',
      },
    ];
    for (const l of logs) {
      await this.aiLogRepo.save(this.aiLogRepo.create({ ...l, tenantId }));
    }

    return { success: true, projectId: project.id };
  }
}
