export interface BillingProvider {
  createCustomer(params: {
    tenantId: string;
    email: string;
    name: string;
  }): Promise<{ customerId: string }>;

  createSubscription(params: {
    tenantId: string;
    customerId: string;
    planKey: string;
    seatCount: number;
  }): Promise<{
    subscriptionId: string;
    status: string;
    clientSecret?: string;
  }>;

  updateSubscriptionSeats(params: {
    subscriptionId: string;
    seatCount: number;
  }): Promise<void>;

  cancelSubscription(params: { subscriptionId: string }): Promise<void>;
}

export const BILLING_PROVIDER_TOKEN = 'BILLING_PROVIDER_TOKEN';
