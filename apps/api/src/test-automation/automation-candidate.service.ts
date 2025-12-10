import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AutomationCandidate,
  CandidateStatus,
} from './automation-candidate.entity';
import { TestCase } from '../test-keys/test-case.entity';
import { TestResult } from '../test-keys/test-result.entity';
import { AiProviderFactory } from '../ai/ai-provider.factory';

export interface CandidateWithMetrics {
  id: string;
  testCaseId: string;
  testCaseTitle: string;
  status: CandidateStatus;
  automationScore: number;
  executionCount: number;
  passRate: number;
  aiRecommendation: string;
  estimatedEffort: string;
  notes?: string;
  createdAt: Date;
}

@Injectable()
export class AutomationCandidateService {
  constructor(
    @InjectRepository(AutomationCandidate)
    private candidateRepo: Repository<AutomationCandidate>,
    @InjectRepository(TestCase)
    private testCaseRepo: Repository<TestCase>,
    @InjectRepository(TestResult)
    private testResultRepo: Repository<TestResult>,
    private aiFactory: AiProviderFactory,
  ) { }

  async getCandidates(
    tenantId: string,
    projectId: string,
  ): Promise<CandidateWithMetrics[]> {
    const candidates = await this.candidateRepo.find({
      where: { tenantId, projectId },
      order: { createdAt: 'DESC' },
    });

    const enriched: CandidateWithMetrics[] = [];
    for (const candidate of candidates) {
      const testCase = await this.testCaseRepo.findOne({
        where: { id: candidate.testCaseId },
      });
      if (!testCase) continue;

      const metrics = await this.calculateTestMetrics(
        candidate.testCaseId,
        tenantId,
      );

      enriched.push({
        id: candidate.id,
        testCaseId: candidate.testCaseId,
        testCaseTitle: testCase.title,
        status: candidate.status,
        automationScore: metrics.automationScore,
        executionCount: metrics.executionCount,
        passRate: metrics.passRate,
        aiRecommendation: metrics.aiRecommendation,
        estimatedEffort: metrics.estimatedEffort,
        notes: candidate.notes,
        createdAt: candidate.createdAt,
      });
    }

    return enriched.sort((a, b) => b.automationScore - a.automationScore);
  }

  async getAutomationCandidatesWithAI(
    tenantId: string,
    projectId: string,
    limit: number = 10,
  ): Promise<CandidateWithMetrics[]> {
    // Find all test cases not yet marked as automation candidates
    const allTestCases = await this.testCaseRepo.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });

    const candidatesWithScores: CandidateWithMetrics[] = [];

    for (const testCase of allTestCases) {
      const metrics = await this.calculateTestMetrics(testCase.id, tenantId);

      // Only include high-scoring candidates
      if (metrics.automationScore >= 50) {
        candidatesWithScores.push({
          id: testCase.id,
          testCaseId: testCase.id,
          testCaseTitle: testCase.title,
          status: testCase.isAutomationCandidate
            ? CandidateStatus.NOT_STARTED
            : CandidateStatus.NOT_STARTED,
          automationScore: metrics.automationScore,
          executionCount: metrics.executionCount,
          passRate: metrics.passRate,
          aiRecommendation: metrics.aiRecommendation,
          estimatedEffort: metrics.estimatedEffort,
          createdAt: testCase.createdAt,
        });
      }
    }

    return candidatesWithScores
      .sort((a, b) => b.automationScore - a.automationScore)
      .slice(0, limit);
  }

  private async calculateTestMetrics(testCaseId: string, tenantId: string) {
    // Get execution history
    const results = await this.testResultRepo.find({
      where: { caseId: testCaseId, tenantId },
      order: { createdAt: 'DESC' },
      take: 50,
    });

    const executionCount = results.length;
    const passCount = results.filter((r) => r.status === 'PASS').length;
    const passRate =
      executionCount > 0 ? Math.round((passCount / executionCount) * 100) : 0;

    // Calculate automation score based on multiple factors
    let automationScore = 0;

    // Factor 1: Execution frequency (0-40 points)
    if (executionCount >= 20) automationScore += 40;
    else if (executionCount >= 10) automationScore += 30;
    else if (executionCount >= 5) automationScore += 20;
    else automationScore += 10;

    // Factor 2: Pass rate stability (0-30 points)
    if (passRate >= 90) automationScore += 30;
    else if (passRate >= 70) automationScore += 20;
    else if (passRate >= 50) automationScore += 10;

    // Factor 3: Test complexity/repeatability (0-30 points)
    const testCase = await this.testCaseRepo.findOne({
      where: { id: testCaseId },
    });
    if (testCase?.steps && testCase.steps.length > 0) {
      const stepCount = testCase.steps.length;
      if (stepCount >= 5 && stepCount <= 15)
        automationScore += 30; // Sweet spot
      else if (stepCount >= 3) automationScore += 20;
      else automationScore += 10;
    }

    // Generate AI recommendation
    // NOTE: In strict architecture, we should use aiFactory to get provider and ask AI
    // For now, retaining static logic but preparing for dynamic provider usage if needed.
    // To use AI here:
    // const { provider } = await this.aiFactory.getProvider(tenantId);
    // const analysis = await provider.analyzeCandidate(...) 

    let aiRecommendation = 'Good candidate';
    if (automationScore >= 80)
      aiRecommendation = 'Excellent candidate - High ROI';
    else if (automationScore >= 60)
      aiRecommendation = 'Good candidate - Moderate ROI';
    else if (automationScore >= 40)
      aiRecommendation = 'Fair candidate - Consider effort';
    else aiRecommendation = 'Low priority - Manual testing may be sufficient';

    // Estimate effort
    const stepCount = testCase?.steps?.length || 0;
    let estimatedEffort = 'Unknown';
    if (stepCount <= 3) estimatedEffort = '1-2 hours';
    else if (stepCount <= 7) estimatedEffort = '2-4 hours';
    else if (stepCount <= 12) estimatedEffort = '4-8 hours';
    else estimatedEffort = '8+ hours';

    return {
      automationScore,
      executionCount,
      passRate,
      aiRecommendation,
      estimatedEffort,
    };
  }

  async createCandidate(
    tenantId: string,
    projectId: string,
    testCaseId: string,
    notes?: string,
  ) {
    const candidate = this.candidateRepo.create({
      tenantId,
      projectId,
      testCaseId,
      status: CandidateStatus.NOT_STARTED,
      notes,
    });

    await this.candidateRepo.save(candidate);

    // Update original test case flag
    await this.testCaseRepo.update(testCaseId, { isAutomationCandidate: true });

    return candidate;
  }

  async updateStatus(id: string, status: CandidateStatus) {
    await this.candidateRepo.update(id, { status });
  }

  async getAutomationCoverage(tenantId: string, projectId: string) {
    const totalTests = await this.testCaseRepo.count({ where: { tenantId } });
    const automatedTests = await this.testCaseRepo.count({
      where: { tenantId, isAutomationCandidate: true },
    });

    const candidates = await this.candidateRepo.find({
      where: { tenantId, projectId },
    });
    const prOpen = candidates.filter(
      (c) => c.status === CandidateStatus.PR_OPEN,
    ).length;
    const merged = candidates.filter(
      (c) => c.status === CandidateStatus.MERGED,
    ).length;

    return {
      totalTests,
      automatedTests,
      automationRate:
        totalTests > 0 ? Math.round((automatedTests / totalTests) * 100) : 0,
      candidates: candidates.length,
      prOpen,
      merged,
      completionRate:
        candidates.length > 0
          ? Math.round((merged / candidates.length) * 100)
          : 0,
    };
  }
}
