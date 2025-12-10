import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SecurityCheck, CheckType, CheckStatus, Severity } from './security-check.entity';

@Injectable()
export class SecurityOpsService {
    constructor(
        @InjectRepository(SecurityCheck)
        private securityCheckRepo: Repository<SecurityCheck>,
    ) { }

    async findAll(tenantId: string): Promise<SecurityCheck[]> {
        return this.securityCheckRepo.find({
            where: { tenantId },
            order: { createdAt: 'DESC' },
        });
    }

    async findByRelease(releaseId: string, tenantId: string): Promise<SecurityCheck[]> {
        return this.securityCheckRepo.find({
            where: { releaseId, tenantId },
            order: { createdAt: 'DESC' },
        });
    }

    async create(data: {
        tenantId: string;
        releaseId?: string;
        type: CheckType;
        name?: string;
        description?: string;
    }): Promise<SecurityCheck> {
        const check = this.securityCheckRepo.create({
            ...data,
            status: CheckStatus.PENDING,
        });
        return this.securityCheckRepo.save(check);
    }

    async updateFindings(
        id: string,
        status: CheckStatus,
        findings: SecurityCheck['findings'],
    ): Promise<SecurityCheck | null> {
        const score = this.calculateScore(findings);
        await this.securityCheckRepo.update(id, {
            status,
            findings,
            score,
            completedAt: new Date(),
        });
        return this.securityCheckRepo.findOne({ where: { id } });
    }

    private calculateScore(findings: SecurityCheck['findings']): number {
        if (!findings) return 100;

        // Deduct points based on severity
        // Critical: -30, High: -15, Medium: -5, Low: -1
        let score = 100;
        score -= (findings.critical || 0) * 30;
        score -= (findings.high || 0) * 15;
        score -= (findings.medium || 0) * 5;
        score -= (findings.low || 0) * 1;

        return Math.max(0, Math.min(100, score));
    }

    /**
     * Calculate aggregate SO score for RCS
     * Uses latest checks for each type, or defaults to baseline
     */
    async calculateSoScore(tenantId: string, releaseId?: string): Promise<{
        score: number;
        details: {
            checksRun: number;
            checksPassed: number;
            criticalIssues: number;
            highIssues: number;
        };
    }> {
        // Get relevant checks
        let checks: SecurityCheck[];
        if (releaseId) {
            checks = await this.findByRelease(releaseId, tenantId);
        } else {
            checks = await this.findAll(tenantId);
        }

        // If no checks run, return baseline score (80)
        if (checks.length === 0) {
            return {
                score: 80,
                details: {
                    checksRun: 0,
                    checksPassed: 0,
                    criticalIssues: 0,
                    highIssues: 0,
                },
            };
        }

        // Get latest check of each type
        const latestByType = new Map<CheckType, SecurityCheck>();
        for (const check of checks) {
            if (check.status === CheckStatus.PASSED || check.status === CheckStatus.FAILED || check.status === CheckStatus.WARNING) {
                const existing = latestByType.get(check.type);
                if (!existing || (check.completedAt && existing.completedAt && check.completedAt > existing.completedAt)) {
                    latestByType.set(check.type, check);
                }
            }
        }

        const completedChecks = Array.from(latestByType.values());
        if (completedChecks.length === 0) {
            return {
                score: 80,
                details: {
                    checksRun: checks.length,
                    checksPassed: 0,
                    criticalIssues: 0,
                    highIssues: 0,
                },
            };
        }

        // Calculate aggregate score
        const totalScore = completedChecks.reduce((sum, c) => sum + (c.score || 0), 0);
        const avgScore = totalScore / completedChecks.length;

        const passedCount = completedChecks.filter(c => c.status === CheckStatus.PASSED).length;
        const criticalIssues = completedChecks.reduce(
            (sum, c) => sum + (c.findings?.critical || 0),
            0,
        );
        const highIssues = completedChecks.reduce(
            (sum, c) => sum + (c.findings?.high || 0),
            0,
        );

        return {
            score: Math.round(avgScore),
            details: {
                checksRun: completedChecks.length,
                checksPassed: passedCount,
                criticalIssues,
                highIssues,
            },
        };
    }

    /**
     * Run a mock security scan (for demo purposes)
     */
    async runMockScan(tenantId: string, releaseId?: string): Promise<SecurityCheck | null> {
        const check = await this.create({
            tenantId,
            releaseId,
            type: CheckType.VULNERABILITY_SCAN,
            name: 'Automated Vulnerability Scan',
            description: 'Mock security scan for demonstration',
        });

        // Simulate scan completion
        const mockFindings = {
            critical: Math.random() < 0.1 ? 1 : 0,
            high: Math.floor(Math.random() * 3),
            medium: Math.floor(Math.random() * 5),
            low: Math.floor(Math.random() * 10),
        };

        const status = mockFindings.critical > 0
            ? CheckStatus.FAILED
            : mockFindings.high > 0
                ? CheckStatus.WARNING
                : CheckStatus.PASSED;

        return this.updateFindings(check.id, status, mockFindings);
    }
}
