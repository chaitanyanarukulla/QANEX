import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sprint, SprintStatus } from './sprint.entity';
import { SprintItem, SprintItemStatus, SprintItemType, SprintItemPriority } from './sprint-item.entity';

@Injectable()
export class SprintsService {
    constructor(
        @InjectRepository(Sprint)
        private sprintsRepository: Repository<Sprint>,
        @InjectRepository(SprintItem)
        private sprintItemsRepository: Repository<SprintItem>,
    ) { }

    // ===== Sprint Management =====

    async create(name: string, tenantId: string, capacity: number = 20, goal?: string, startDate?: Date, endDate?: Date): Promise<Sprint> {
        const sprint = this.sprintsRepository.create({
            name,
            tenantId,
            capacity,
            goal,
            startDate,
            endDate,
            status: SprintStatus.PLANNED,
        });
        return this.sprintsRepository.save(sprint);
    }

    async findAll(tenantId: string): Promise<Sprint[]> {
        return this.sprintsRepository.find({
            where: { tenantId },
            order: { createdAt: 'DESC' },
        });
    }

    async findOne(id: string, tenantId: string): Promise<Sprint> {
        const sprint = await this.sprintsRepository.findOne({ where: { id, tenantId } });
        if (!sprint) {
            throw new NotFoundException(`Sprint ${id} not found`);
        }
        return sprint;
    }

    async updateStatus(id: string, tenantId: string, status: SprintStatus): Promise<Sprint> {
        const sprint = await this.findOne(id, tenantId);
        sprint.status = status;

        // Auto-set dates when starting
        if (status === SprintStatus.ACTIVE && !sprint.startDate) {
            sprint.startDate = new Date();
            if (!sprint.endDate) {
                // Default 2-week sprint
                const endDate = new Date();
                endDate.setDate(endDate.getDate() + 14);
                sprint.endDate = endDate;
            }
        }

        return this.sprintsRepository.save(sprint);
    }

    async update(id: string, tenantId: string, data: Partial<Sprint>): Promise<Sprint> {
        const sprint = await this.findOne(id, tenantId);
        Object.assign(sprint, data);
        return this.sprintsRepository.save(sprint);
    }

    // ===== Sprint Item Management =====

    async addItem(
        sprintId: string | null,
        tenantId: string,
        data: {
            title: string;
            description?: string;
            type?: SprintItemType;
            priority?: SprintItemPriority;
            status?: SprintItemStatus;
            requirementId?: string;
            rqsScore?: number;
            assigneeId?: string;
            assigneeName?: string;
        }
    ): Promise<SprintItem> {
        // Validate sprint exists if provided
        if (sprintId) {
            await this.findOne(sprintId, tenantId);
        }

        const item = this.sprintItemsRepository.create({
            ...data,
            sprintId: sprintId || undefined,
            tenantId,
            status: data.status || (sprintId ? SprintItemStatus.TODO : SprintItemStatus.BACKLOG),
        });

        return this.sprintItemsRepository.save(item);
    }

    async getSprintItems(sprintId: string, tenantId: string): Promise<SprintItem[]> {
        await this.findOne(sprintId, tenantId);
        return this.sprintItemsRepository.find({
            where: { sprintId, tenantId },
            order: { createdAt: 'ASC' },
        });
    }

    async getBacklogItems(tenantId: string): Promise<SprintItem[]> {
        return this.sprintItemsRepository.find({
            where: {
                tenantId,
                sprintId: null as any, // Items not in any sprint
            },
            order: { priority: 'DESC', createdAt: 'DESC' },
        });
    }

    async updateItem(
        itemId: string,
        tenantId: string,
        data: Partial<SprintItem>
    ): Promise<SprintItem> {
        const item = await this.sprintItemsRepository.findOne({
            where: { id: itemId, tenantId },
        });

        if (!item) {
            throw new NotFoundException(`Sprint item ${itemId} not found`);
        }

        Object.assign(item, data);
        return this.sprintItemsRepository.save(item);
    }

    async moveItemToSprint(itemId: string, sprintId: string | null, tenantId: string, status?: SprintItemStatus): Promise<SprintItem> {
        const item = await this.sprintItemsRepository.findOne({
            where: { id: itemId, tenantId },
        });

        if (!item) {
            throw new NotFoundException(`Sprint item ${itemId} not found`);
        }

        // Validate sprint exists if moving to sprint
        if (sprintId) {
            await this.findOne(sprintId, tenantId);
        }

        item.sprintId = sprintId || undefined;
        item.status = status || (sprintId ? SprintItemStatus.TODO : SprintItemStatus.BACKLOG);

        return this.sprintItemsRepository.save(item);
    }

    async removeItem(itemId: string, tenantId: string): Promise<void> {
        const result = await this.sprintItemsRepository.delete({ id: itemId, tenantId });
        if (result.affected === 0) {
            throw new NotFoundException(`Sprint item ${itemId} not found`);
        }
    }

    // ===== Sprint Metrics =====

    async getSprintMetrics(sprintId: string, tenantId: string) {
        await this.findOne(sprintId, tenantId);

        const items = await this.sprintItemsRepository.find({
            where: { sprintId, tenantId },
        });

        const total = items.length;
        const done = items.filter(i => i.status === SprintItemStatus.DONE).length;
        const inProgress = items.filter(i => i.status === SprintItemStatus.IN_PROGRESS).length;
        const todo = items.filter(i => i.status === SprintItemStatus.TODO).length;
        const inTesting = items.filter(i => i.status === SprintItemStatus.IN_TESTING).length;
        const codeReview = items.filter(i => i.status === SprintItemStatus.CODE_REVIEW).length;
        const readyForQa = items.filter(i => i.status === SprintItemStatus.READY_FOR_QA).length;

        const byPriority = {
            critical: items.filter(i => i.priority === SprintItemPriority.CRITICAL).length,
            high: items.filter(i => i.priority === SprintItemPriority.HIGH).length,
            medium: items.filter(i => i.priority === SprintItemPriority.MEDIUM).length,
            low: items.filter(i => i.priority === SprintItemPriority.LOW).length,
        };

        const byType = {
            feature: items.filter(i => i.type === SprintItemType.FEATURE).length,
            bug: items.filter(i => i.type === SprintItemType.BUG).length,
            task: items.filter(i => i.type === SprintItemType.TASK).length,
        };

        const avgRqsScore = items.filter(i => i.rqsScore).length > 0
            ? items.reduce((sum, i) => sum + (i.rqsScore || 0), 0) / items.filter(i => i.rqsScore).length
            : null;

        return {
            total,
            done,
            inProgress,
            todo,
            inTesting,
            codeReview,
            readyForQa,
            progress: total > 0 ? Math.round((done / total) * 100) : 0,
            byPriority,
            byType,
            avgRqsScore: avgRqsScore ? Math.round(avgRqsScore) : null,
        };
    }

    async getActiveSprint(tenantId: string): Promise<Sprint | null> {
        const sprint = await this.sprintsRepository.findOne({
            where: { tenantId, status: SprintStatus.ACTIVE },
            order: { startDate: 'DESC' },
        });
        return sprint;
    }

    // ===== AI Planning =====

    async planSprint(tenantId: string, capacity: number = 20): Promise<{
        recommendedItems: Array<{
            item: SprintItem;
            reason: string;
            score: number;
        }>;
        totalRecommended: number;
        capacityUtilized: number;
        reasoning: string;
    }> {
        // Get all backlog items
        const backlogItems = await this.getBacklogItems(tenantId);

        if (backlogItems.length === 0) {
            return {
                recommendedItems: [],
                totalRecommended: 0,
                capacityUtilized: 0,
                reasoning: 'No backlog items available for planning.',
            };
        }

        // Score each item based on priority and RQS
        const scoredItems = backlogItems.map(item => {
            // Priority scoring: CRITICAL=40, HIGH=30, MEDIUM=20, LOW=10
            const priorityScore = {
                [SprintItemPriority.CRITICAL]: 40,
                [SprintItemPriority.HIGH]: 30,
                [SprintItemPriority.MEDIUM]: 20,
                [SprintItemPriority.LOW]: 10,
            }[item.priority] || 0;

            // RQS scoring: normalize 0-100 to 0-40 points
            const rqsScore = ((item.rqsScore || 0) / 100) * 40;

            // Type impact: Features are more valuable than tasks, tasks > bugs
            const typeScore = {
                [SprintItemType.FEATURE]: 20,
                [SprintItemType.TASK]: 15,
                [SprintItemType.BUG]: 10,
            }[item.type] || 0;

            // Total score out of 100
            const totalScore = priorityScore + rqsScore + typeScore;

            return {
                item,
                score: Math.round(totalScore),
                breakdown: { priorityScore, rqsScore, typeScore },
            };
        });

        // Sort by score descending
        scoredItems.sort((a, b) => b.score - a.score);

        // Select items up to capacity
        const recommendedItems = [];
        let currentCapacity = 0;

        for (const { item, score, breakdown } of scoredItems) {
            if (currentCapacity < capacity) {
                // Generate reasoning for this item
                const reasons = [];
                if (breakdown.priorityScore >= 30) {
                    reasons.push(`Critical/High priority (${item.priority})`);
                }
                if (item.rqsScore && item.rqsScore >= 70) {
                    reasons.push(`Strong requirement quality (RQS: ${item.rqsScore})`);
                }
                if (item.type === SprintItemType.FEATURE) {
                    reasons.push('High-value feature');
                }
                if (item.priority === SprintItemPriority.CRITICAL) {
                    reasons.push('Blocks release');
                }

                recommendedItems.push({
                    item,
                    reason: reasons.join('; '),
                    score,
                });

                currentCapacity++;
            }
        }

        // Generate overall reasoning
        const reasoning = this.generatePlanningReasoning(
            backlogItems.length,
            recommendedItems.length,
            capacity
        );

        return {
            recommendedItems,
            totalRecommended: recommendedItems.length,
            capacityUtilized: recommendedItems.length,
            reasoning,
        };
    }

    private generatePlanningReasoning(
        totalBacklog: number,
        recommended: number,
        capacity: number
    ): string {
        const utilizationRate = Math.round((recommended / capacity) * 100);
        const remainingBacklog = totalBacklog - recommended;

        return `AI selected ${recommended} items for your sprint (${utilizationRate}% capacity utilization). ` +
            `${remainingBacklog} items remain in backlog. ` +
            `Selection prioritizes: Critical/High priority items, high RQS requirements, and valuable features. `;
    }
}
