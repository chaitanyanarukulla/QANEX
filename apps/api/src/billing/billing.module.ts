import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Plan } from './plan.entity';
import { Subscription } from './subscription.entity';
import { SubscriptionService } from './subscription.service';
import { PlanLimitsService } from './plan-limits.service';
import { StripeBillingProvider } from './stripe.provider';
import { BILLING_PROVIDER_TOKEN } from './billing-provider.interface';

@Global()
@Module({
    imports: [
        TypeOrmModule.forFeature([Plan, Subscription]),
    ],
    providers: [
        SubscriptionService,
        PlanLimitsService,
        {
            provide: BILLING_PROVIDER_TOKEN,
            useClass: StripeBillingProvider,
        },
    ],
    exports: [SubscriptionService, PlanLimitsService],
})
export class BillingModule { }
