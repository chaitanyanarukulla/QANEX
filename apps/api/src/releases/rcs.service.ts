import { Injectable } from '@nestjs/common';
import { ReleasesService } from './releases.service';
import { RequirementsService } from '../requirements/requirements.service';
import { TestKeysService } from '../test-keys/test-keys.service';
import { BugsService } from '../bugs/bugs.service';
import { SecurityOpsService } from '../security-ops/security-ops.service';
import { AiProviderFactory } from '../ai/providers';

@Injectable()
export class RcsService {
  constructor(
    private releasesService: ReleasesService,
    private requirementsService: RequirementsService,
    private testKeysService: TestKeysService,
    private bugsService: BugsService,
    private securityOpsService: SecurityOpsService,
    private aiFactory: AiProviderFactory,
  ) {}

  async calculateRcs(releaseId: string, tenantId: string) {
    // 1. Fetch Release Context
    const release = await this.releasesService.findOne(releaseId, tenantId);

    // 2. Fetch Data (In real app, filter by release/sprint linked to release)
    // For prototype, we'll fetch ALL active data for the tenant as a "Snapshot".
    // Improved logic would be: Fetch items where releaseId = release.id
    const requirements = await this.requirementsService.findAll(tenantId);
    const bugs = await this.bugsService.findAll(tenantId);
    // We'd typically run a specific TestRun for a release.
    // Let's assume we look at the LATEST Test Run.
    const testRuns = await this.testKeysService.findAllTestRuns(tenantId);
    // Need to get results for latest run. This requires extending Service or specific Repo access.
    // For now, mocking the Test Results aggregation.

    // --- CALCULATION LOGIC ---

    // Pillar 1: RP (Requirements & Planning)
    // Rule: % of Requirements in "READY" state.
    const totalReqs = requirements.length || 1;
    const readyReqs = requirements.filter((r) => r.state === 'READY').length;
    const rpScore = (readyReqs / totalReqs) * 100;

    // Pillar 2: QT (Quality & Testing)
    // Rule: % of Test Cases passed from latest test run
    const qtScore = await this.testKeysService.getLatestPassRate(tenantId);

    // Pillar 3: B (Bugs)
    // Rule: Start at 100. Deduct for open bugs based on Severity.
    // Critical: -40, High: -20, Medium: -10, Low: -2
    let bScore = 100;
    const openBugs = bugs.filter(
      (b) => b.status !== 'RESOLVED' && b.status !== 'CLOSED',
    );
    for (const bug of openBugs) {
      if (bug.severity === 'CRITICAL') bScore -= 40;
      else if (bug.severity === 'HIGH') bScore -= 20;
      else if (bug.severity === 'MEDIUM') bScore -= 10;
      else bScore -= 2;
    }
    bScore = Math.max(0, bScore); // Floor at 0

    // Pillar 4: SO (Security & Ops)
    // Calculate from security checks
    const soResult = await this.securityOpsService.calculateSoScore(
      tenantId,
      releaseId,
    );
    const soScore = soResult.score;

    // Final Aggregate (Weighted Average)
    // QT: 40%, B: 30%, RP: 20%, SO: 10%
    const totalScore =
      qtScore * 0.4 + bScore * 0.3 + rpScore * 0.2 + soScore * 0.1;

    const breakdown = {
      rp: Math.round(rpScore),
      qt: Math.round(qtScore),
      b: Math.round(bScore),
      so: Math.round(soScore),
      details: {
        openBugs: openBugs.length,
        readyReqs,
        totalReqs,
        testPassRate: qtScore,
        testRunsCount: testRuns.length,
        securityChecks: soResult.details.checksRun,
        securityChecksPassed: soResult.details.checksPassed,
        criticalSecurityIssues: soResult.details.criticalIssues,
      },
    };

    // 3. Save History
    await this.releasesService.updateScore(release.id, totalScore, breakdown);

    // 4. AI Explanation (Async)
    this.generateAiExplanation(
      release.id,
      tenantId,
      totalScore,
      breakdown,
    ).catch(console.error);

    return { score: Math.round(totalScore), breakdown };
  }

  async generateAiExplanation(
    releaseId: string,
    tenantId: string,
    score: number,
    breakdown: any,
  ) {
    try {
      const { provider } = await this.aiFactory.getProvider(tenantId);
      if (provider.explainRcs) {
        const explanation = await provider.explainRcs(score, breakdown);
        await this.releasesService.updateExplanation(releaseId, explanation);
      }
    } catch (error) {
      console.error('Failed to generate AI explanation:', error);
    }
  }

  async evaluateReleaseGates(
    releaseId: string,
    tenantId: string,
    overrideReason?: string,
  ) {
    // Get RCS Score
    const rcsResult = await this.calculateRcs(releaseId, tenantId);

    // Get additional metrics
    const bugs = await this.bugsService.findAll(tenantId);
    const requirements = await this.requirementsService.findAll(tenantId);

    // Evaluate Gates
    const gates = [];

    // Gate 1: RCS Score (must be >= 75 to pass)
    const rcsGate = {
      name: 'Release Confidence Score',
      type: 'rcs_score' as const,
      passed: rcsResult.score >= 75,
      required: true,
      score: rcsResult.score,
      threshold: 75,
      message:
        rcsResult.score >= 75
          ? `RCS score of ${rcsResult.score} meets minimum threshold`
          : `RCS score of ${rcsResult.score} is below minimum threshold of 75`,
    };
    gates.push(rcsGate);

    // Gate 2: Critical Bugs (must be 0 to pass)
    const criticalBugs = bugs.filter(
      (b) =>
        b.severity === 'CRITICAL' &&
        b.status !== 'RESOLVED' &&
        b.status !== 'CLOSED',
    );
    const criticalBugsGate = {
      name: 'Critical Bugs',
      type: 'critical_bugs' as const,
      passed: criticalBugs.length === 0,
      required: true,
      count: criticalBugs.length,
      threshold: 0,
      message:
        criticalBugs.length === 0
          ? 'No open critical bugs'
          : `${criticalBugs.length} open critical bug(s) must be resolved`,
      details: criticalBugs.map((b) => ({
        id: b.id,
        title: b.title,
        priority: b.priority,
      })),
    };
    gates.push(criticalBugsGate);

    // Gate 3: Test Coverage (using QT score, must be >= 80%)
    const testCoverageGate = {
      name: 'Test Coverage',
      type: 'test_coverage' as const,
      passed: rcsResult.breakdown.qt >= 80,
      required: true,
      percent: rcsResult.breakdown.qt,
      threshold: 80,
      message:
        rcsResult.breakdown.qt >= 80
          ? `Test pass rate of ${rcsResult.breakdown.qt}% meets minimum threshold`
          : `Test pass rate of ${rcsResult.breakdown.qt}% is below minimum threshold of 80%`,
    };
    gates.push(testCoverageGate);

    // Gate 4: Requirements Readiness (must be >= 90% ready)
    const totalReqs = requirements.length || 1;
    const readyReqs = requirements.filter((r) => r.state === 'READY').length;
    const readinessPercent = Math.round((readyReqs / totalReqs) * 100);
    const requirementsGate = {
      name: 'Requirements Readiness',
      type: 'requirements' as const,
      passed: readinessPercent >= 90,
      required: false,
      percent: readinessPercent,
      threshold: 90,
      message:
        readinessPercent >= 90
          ? `${readinessPercent}% of requirements are ready`
          : `Only ${readinessPercent}% of requirements are ready (target: 90%)`,
    };
    gates.push(requirementsGate);

    // Gate 5: High Priority Bugs (must be <= 2 to pass)
    const highBugs = bugs.filter(
      (b) =>
        b.severity === 'HIGH' &&
        b.status !== 'RESOLVED' &&
        b.status !== 'CLOSED',
    );
    const highBugsGate = {
      name: 'High Priority Bugs',
      type: 'high_bugs' as const,
      passed: highBugs.length <= 2,
      required: false,
      count: highBugs.length,
      threshold: 2,
      message:
        highBugs.length <= 2
          ? `${highBugs.length} high priority bug(s) within acceptable range`
          : `${highBugs.length} high priority bug(s) exceed threshold of 2`,
    };
    gates.push(highBugsGate);

    // Determine overall pass/fail
    const requiredGates = gates.filter((g) => g.required);
    const optionalGates = gates.filter((g) => !g.required);

    const allRequiredPassed = requiredGates.every((g) => g.passed);
    const optionalPassed = optionalGates.filter((g) => g.passed).length;
    const optionalTotal = optionalGates.length;

    // Can release if:
    // 1. All required gates pass, OR
    // 2. Override is provided with a reason
    const canRelease = overrideReason ? true : allRequiredPassed;

    return {
      canRelease,
      overrideApplied: !!overrideReason,
      overrideReason,
      gates,
      summary: {
        total: gates.length,
        passed: gates.filter((g) => g.passed).length,
        failed: gates.filter((g) => !g.passed).length,
        requiredPassed: requiredGates.filter((g) => g.passed).length,
        requiredTotal: requiredGates.length,
        optionalPassed,
        optionalTotal,
      },
      rcsScore: rcsResult.score,
      breakdown: rcsResult.breakdown,
    };
  }
}
