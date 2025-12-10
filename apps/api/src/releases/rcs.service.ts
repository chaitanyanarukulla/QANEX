import { Injectable, Inject } from '@nestjs/common';
import { ReleasesService } from './releases.service';
import { RequirementsService } from '../requirements/requirements.service';
import { TestKeysService } from '../test-keys/test-keys.service';
import { BugsService } from '../bugs/bugs.service';
import { SecurityOpsService } from '../security-ops/security-ops.service';

import type { AiProvider } from '../ai/ai.interface';
import { AI_PROVIDER_TOKEN } from '../ai/ai.interface';

@Injectable()
export class RcsService {
    constructor(
        private releasesService: ReleasesService,
        private requirementsService: RequirementsService,
        private testKeysService: TestKeysService,
        private bugsService: BugsService,
        private securityOpsService: SecurityOpsService,
        @Inject(AI_PROVIDER_TOKEN) private aiProvider: AiProvider,
    ) { }

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
        const readyReqs = requirements.filter(r => r.state === 'READY').length;
        const rpScore = (readyReqs / totalReqs) * 100;

        // Pillar 2: QT (Quality & Testing)
        // Rule: % of Test Cases passed from latest test run
        const qtScore = await this.testKeysService.getLatestPassRate(tenantId);

        // Pillar 3: B (Bugs)
        // Rule: Start at 100. Deduct for open bugs based on Severity.
        // Critical: -40, High: -20, Medium: -10, Low: -2
        let bScore = 100;
        const openBugs = bugs.filter(b => b.status !== 'RESOLVED' && b.status !== 'CLOSED');
        for (const bug of openBugs) {
            if (bug.severity === 'CRITICAL') bScore -= 40;
            else if (bug.severity === 'HIGH') bScore -= 20;
            else if (bug.severity === 'MEDIUM') bScore -= 10;
            else bScore -= 2;
        }
        bScore = Math.max(0, bScore); // Floor at 0

        // Pillar 4: SO (Security & Ops)
        // Calculate from security checks
        const soResult = await this.securityOpsService.calculateSoScore(tenantId, releaseId);
        const soScore = soResult.score;

        // Final Aggregate (Weighted Average)
        // QT: 40%, B: 30%, RP: 20%, SO: 10%
        const totalScore = (qtScore * 0.4) + (bScore * 0.3) + (rpScore * 0.2) + (soScore * 0.1);

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
            }
        };

        // 3. Save History
        await this.releasesService.updateScore(release.id, totalScore, breakdown);

        // 4. AI Explanation (Async)
        this.generateAiExplanation(release.id, tenantId, totalScore, breakdown).catch(console.error);

        return { score: Math.round(totalScore), breakdown };
    }

    async generateAiExplanation(releaseId: string, tenantId: string, score: number, breakdown: any) {
        try {
            if (this.aiProvider.explainRcs) {
                const explanation = await this.aiProvider.explainRcs({ score, breakdown });
                await this.releasesService.updateExplanation(releaseId, explanation);
            }
        } catch (error) {
            console.error('Failed to generate AI explanation:', error);
        }
    }
}
