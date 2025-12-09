import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AutomationCandidate, CandidateStatus } from './automation-candidate.entity';
import { TestCase } from '../test-keys/test-case.entity';

@Injectable()
export class AutomationCandidateService {
    constructor(
        @InjectRepository(AutomationCandidate)
        private candidateRepo: Repository<AutomationCandidate>,
        @InjectRepository(TestCase)
        private testCaseRepo: Repository<TestCase>,
    ) { }

    async getCandidates(tenantId: string, projectId: string) {
        return this.candidateRepo.find({ where: { tenantId, projectId }, order: { createdAt: 'DESC' } });
    }

    async createCandidate(tenantId: string, projectId: string, testCaseId: string, notes?: string) {
        const candidate = this.candidateRepo.create({
            tenantId,
            projectId,
            testCaseId,
            status: CandidateStatus.NOT_STARTED,
            notes
        });

        await this.candidateRepo.save(candidate);

        // Update original test case flag
        await this.testCaseRepo.update(testCaseId, { isAutomationCandidate: true });

        return candidate;
    }

    async updateStatus(id: string, status: CandidateStatus) {
        await this.candidateRepo.update(id, { status });
    }
}
