import {
  Injectable,
  OnModuleInit,
  Logger,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Plan, PlanKey } from './plan.entity';
import {
  Subscription,
  SubscriptionStatus,
  BillingProviderType,
} from './subscription.entity';
import { BILLING_PROVIDER_TOKEN } from './billing-provider.interface';
import type { BillingProvider } from './billing-provider.interface';

@Injectable()
export class SubscriptionService implements OnModuleInit {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    @InjectRepository(Plan)
    private planRepository: Repository<Plan>,
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
    @Inject(BILLING_PROVIDER_TOKEN)
    private billingProvider: BillingProvider,
  ) { }

  async onModuleInit() {
    await this.seedPlans();
  }

  private async seedPlans() {
    const count = await this.planRepository.count();
    if (count > 0) return;

    this.logger.log('Seeding default plans...');
    const plans = [
      {
        key: PlanKey.STARTER,
        name: 'Starter',
        description: 'For small teams getting started.',
        pricePerSeat: 0,
        maxUsers: 5,
        maxProjects: 2,
        featureFlags: {
          rcsGates: false,
          automationPrs: false,
          localAiMode: false,
        },
      },
      {
        key: PlanKey.PRO,
        name: 'Pro',
        description: 'For growing teams needing automation.',
        pricePerSeat: 29,
        maxUsers: null, // Unlimited
        maxProjects: null,
        featureFlags: {
          rcsGates: true,
          automationPrs: true,
          localAiMode: false,
        },
      },
      {
        key: PlanKey.ENTERPRISE,
        name: 'Enterprise',
        description: 'Security, compliance, and custom limits.',
        pricePerSeat: 99,
        maxUsers: null,
        maxProjects: null,
        featureFlags: {
          rcsGates: true,
          automationPrs: true,
          localAiMode: true,
        },
      },
    ];

    for (const p of plans) {
      await this.planRepository.save(this.planRepository.create(p));
    }
  }

  async createTrialSubscription(
    tenantId: string,
    email: string,
    name: string,
  ): Promise<Subscription> {
    // 1. Get Starter Plan
    const plan = await this.planRepository.findOne({
      where: { key: PlanKey.STARTER },
    });
    if (!plan) throw new Error('Starter plan not found');

    // 2. Create Billing Customer (optional for Starter/Free but good practice)
    let customerId;
    try {
      const result = await this.billingProvider.createCustomer({
        tenantId,
        email,
        name,
      });
      customerId = result.customerId;
    } catch (e) {
      this.logger.error('Failed to create billing customer', e);
    }

    // 3. Create Subscription Record
    const sub = this.subscriptionRepository.create({
      tenantId,
      planId: plan.id,
      status: SubscriptionStatus.ACTIVE, // Free plan is always active
      billingProvider: BillingProviderType.STRIPE,
      billingCustomerId: customerId,
      seatCount: 1,
    });

    return this.subscriptionRepository.save(sub);
  }

  async getSubscription(tenantId: string): Promise<Subscription> {
    let sub = await this.subscriptionRepository.findOne({
      where: { tenantId },
      relations: ['plan'],
    });

    // Fallback if no sub exists (shouldn't happen if created on tenant creation, but safety)
    if (!sub) {
      // Force create one? Or return a dummy 'Free' sub?
      // For now, let's assume we create one on the fly or throw.
      const plan = await this.planRepository.findOne({
        where: { key: PlanKey.STARTER },
      });
      if (!plan)
        throw new Error(
          'Starter plan not found during fallback subscription creation',
        );

      sub = this.subscriptionRepository.create({
        tenantId,
        plan,
        planId: plan.id,
        status: SubscriptionStatus.ACTIVE,
        seatCount: 1,
      });
      await this.subscriptionRepository.save(sub);
    }
    return sub;
  }

  async getPlanLimits(tenantId: string): Promise<{
    maxUsers: number | null;
    maxProjects: number | null;
    flags: any;
  }> {
    const sub = await this.getSubscription(tenantId);
    // If expired/canceled, maybe return 0 limits?
    if (
      sub.status !== SubscriptionStatus.ACTIVE &&
      sub.status !== SubscriptionStatus.TRIALING
    ) {
      return { maxUsers: 0, maxProjects: 0, flags: {} };
    }
    return {
      maxUsers: sub.plan?.maxUsers ?? null,
      maxProjects: sub.plan?.maxProjects ?? null,
      flags: sub.plan?.featureFlags ?? {},
    };
  }
}
