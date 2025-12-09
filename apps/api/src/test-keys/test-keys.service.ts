import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TestCase } from './test-case.entity';
import { TestRun, TestRunStatus } from './test-run.entity';
import { TestResult, TestResultStatus } from './test-result.entity';

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
        return this.testCaseRepo.find({ where: { tenantId } });
    }

    // --- Test Runs ---
    async createTestRun(name: string, tenantId: string): Promise<TestRun> {
        const run = this.testRunRepo.create({ name, tenantId, status: TestRunStatus.PENDING });
        return this.testRunRepo.save(run);
    }

    async findAllTestRuns(tenantId: string): Promise<TestRun[]> {
        return this.testRunRepo.find({ where: { tenantId } });
    }

    // --- Test Results ---
    async recordResult(runId: string, caseId: string, status: TestResultStatus, tenantId: string, notes?: string): Promise<TestResult> {
        const result = this.testResultRepo.create({
            runId,
            caseId,
            status,
            tenantId,
            notes,
        });
        return this.testResultRepo.save(result);
    }
}
