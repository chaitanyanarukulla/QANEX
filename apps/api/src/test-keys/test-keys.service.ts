import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TestCase } from './test-case.entity';
import { TestRun, TestRunStatus } from './test-run.entity';
import { TestResult, TestResultStatus } from './test-result.entity';

export interface TestRunStats {
    total: number;
    passed: number;
    failed: number;
    blocked: number;
    skipped: number;
    passRate: number;
}

export interface TestRunWithStats extends TestRun {
    stats: TestRunStats;
}

@Injectable()
export class TestKeysService {
    constructor(
        @InjectRepository(TestCase)
        private testCaseRepo: Repository<TestCase>,
        @InjectRepository(TestRun)
        private testRunRepo: Repository<TestRun>,
        @InjectRepository(TestResult)
        private testResultRepo: Repository<TestResult>,
    ) { }

    // --- Test Cases ---
    async createTestCase(data: Partial<TestCase>, tenantId: string): Promise<TestCase> {
        const testCase = this.testCaseRepo.create({ ...data, tenantId });
        return this.testCaseRepo.save(testCase);
    }

    async findAllTestCases(tenantId: string): Promise<TestCase[]> {
        return this.testCaseRepo.find({ where: { tenantId }, order: { createdAt: 'DESC' } });
    }

    async findOneTestCase(id: string, tenantId: string): Promise<TestCase> {
        const testCase = await this.testCaseRepo.findOne({ where: { id, tenantId } });
        if (!testCase) {
            throw new NotFoundException(`Test case ${id} not found`);
        }
        return testCase;
    }

    async updateTestCase(id: string, data: Partial<TestCase>, tenantId: string): Promise<TestCase> {
        await this.testCaseRepo.update({ id, tenantId }, data);
        return this.findOneTestCase(id, tenantId);
    }

    async deleteTestCase(id: string, tenantId: string): Promise<void> {
        await this.testCaseRepo.delete({ id, tenantId });
    }

    // --- Test Runs ---
    async createTestRun(name: string, tenantId: string): Promise<TestRun> {
        const run = this.testRunRepo.create({ name, tenantId, status: TestRunStatus.PENDING });
        return this.testRunRepo.save(run);
    }

    async findAllTestRuns(tenantId: string): Promise<TestRun[]> {
        return this.testRunRepo.find({ where: { tenantId }, order: { createdAt: 'DESC' } });
    }

    async findOneTestRun(id: string, tenantId: string): Promise<TestRun> {
        const run = await this.testRunRepo.findOne({ where: { id, tenantId } });
        if (!run) {
            throw new NotFoundException(`Test run ${id} not found`);
        }
        return run;
    }

    async updateTestRunStatus(id: string, status: TestRunStatus, tenantId: string): Promise<TestRun> {
        await this.testRunRepo.update({ id, tenantId }, { status });
        return this.findOneTestRun(id, tenantId);
    }

    async startTestRun(id: string, tenantId: string): Promise<TestRun> {
        return this.updateTestRunStatus(id, TestRunStatus.IN_PROGRESS, tenantId);
    }

    async completeTestRun(id: string, tenantId: string): Promise<TestRun> {
        return this.updateTestRunStatus(id, TestRunStatus.COMPLETED, tenantId);
    }

    async getTestRunWithStats(id: string, tenantId: string): Promise<TestRunWithStats> {
        const run = await this.findOneTestRun(id, tenantId);
        const stats = await this.getTestRunStats(id, tenantId);
        return { ...run, stats };
    }

    async getTestRunsWithStats(tenantId: string): Promise<TestRunWithStats[]> {
        const runs = await this.findAllTestRuns(tenantId);
        const runsWithStats = await Promise.all(
            runs.map(async (run) => {
                const stats = await this.getTestRunStats(run.id, tenantId);
                return { ...run, stats };
            })
        );
        return runsWithStats;
    }

    async getTestRunStats(runId: string, tenantId: string): Promise<TestRunStats> {
        const results = await this.testResultRepo.find({ where: { runId, tenantId } });

        const total = results.length;
        const passed = results.filter(r => r.status === TestResultStatus.PASS).length;
        const failed = results.filter(r => r.status === TestResultStatus.FAIL).length;
        const blocked = results.filter(r => r.status === TestResultStatus.BLOCKED).length;
        const skipped = results.filter(r => r.status === TestResultStatus.SKIPPED).length;
        const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;

        return { total, passed, failed, blocked, skipped, passRate };
    }

    // --- Test Results ---
    async recordResult(runId: string, caseId: string, status: TestResultStatus, tenantId: string, notes?: string): Promise<TestResult> {
        // Check if result already exists for this run/case combination
        const existing = await this.testResultRepo.findOne({ where: { runId, caseId, tenantId } });

        if (existing) {
            // Update existing result
            existing.status = status;
            existing.notes = notes;
            return this.testResultRepo.save(existing);
        }

        const result = this.testResultRepo.create({
            runId,
            caseId,
            status,
            tenantId,
            notes,
        });
        return this.testResultRepo.save(result);
    }

    async getResultsForRun(runId: string, tenantId: string): Promise<TestResult[]> {
        return this.testResultRepo.find({
            where: { runId, tenantId },
            order: { createdAt: 'DESC' }
        });
    }

    // --- Metrics for RCS ---
    async getLatestPassRate(tenantId: string): Promise<number> {
        const runs = await this.findAllTestRuns(tenantId);
        if (runs.length === 0) return 0;

        // Get the most recent run with results
        for (const run of runs) {
            const stats = await this.getTestRunStats(run.id, tenantId);
            if (stats.total > 0) {
                return stats.passRate;
            }
        }
        return 0;
    }
}
