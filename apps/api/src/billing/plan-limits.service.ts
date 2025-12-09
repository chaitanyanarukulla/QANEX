import { Injectable, ForbiddenException } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';

@Injectable()
export class PlanLimitsService {
    constructor(private readonly subscriptionService: SubscriptionService) { }

    async assertCanAddUser(tenantId: string, currentCount: number): Promise<void> {
        const limits = await this.subscriptionService.getPlanLimits(tenantId);
        if (limits.maxUsers !== null && currentCount >= limits.maxUsers) {
            throw new ForbiddenException(`Plan limit reached: Max ${limits.maxUsers} users. Upgrade to add more.`);
        }
    }

    async assertCanAddProject(tenantId: string, currentCount: number): Promise<void> {
        const limits = await this.subscriptionService.getPlanLimits(tenantId);
        if (limits.maxProjects !== null && currentCount >= limits.maxProjects) {
            throw new ForbiddenException(`Plan limit reached: Max ${limits.maxProjects} projects. Upgrade to add more.`);
        }
    }

    async checkFeature(tenantId: string, featureKey: string): Promise<boolean> {
        const limits = await this.subscriptionService.getPlanLimits(tenantId);
        return !!limits.flags[featureKey];
    }
}
