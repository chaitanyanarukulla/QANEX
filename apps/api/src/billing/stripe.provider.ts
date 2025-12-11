import { Injectable, Logger } from '@nestjs/common';
import { BillingProvider } from './billing-provider.interface';

@Injectable()
export class StripeBillingProvider implements BillingProvider {
  private readonly logger = new Logger(StripeBillingProvider.name);

  createCustomer(params: {
    tenantId: string;
    email: string;
    name: string;
  }): Promise<{ customerId: string }> {
    this.logger.log(
      `[Stripe] Creating customer for tenant ${params.tenantId} (${params.email})`,
    );
    return Promise.resolve({ customerId: `cus_mock_${Date.now()}` });
  }

  createSubscription(params: {
    tenantId: string;
    customerId: string;
    planKey: string;
    seatCount: number;
  }): Promise<{
    subscriptionId: string;
    status: string;
    clientSecret?: string;
  }> {
    this.logger.log(
      `[Stripe] Creating sub for ${params.customerId}, plan=${params.planKey}, seats=${params.seatCount}`,
    );
    return Promise.resolve({
      subscriptionId: `sub_mock_${Date.now()}`,
      status: 'active',
      clientSecret: 'seti_mock_secret',
    });
  }

  updateSubscriptionSeats(params: {
    subscriptionId: string;
    seatCount: number;
  }): Promise<void> {
    this.logger.log(
      `[Stripe] Updating sub ${params.subscriptionId} to ${params.seatCount} seats`,
    );
    return Promise.resolve();
  }

  cancelSubscription(params: { subscriptionId: string }): Promise<void> {
    this.logger.log(`[Stripe] Cancelling sub ${params.subscriptionId}`);
    return Promise.resolve();
  }
}
