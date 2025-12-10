import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Plan } from './plan.entity';

export enum SubscriptionStatus {
  TRIALING = 'TRIALING',
  ACTIVE = 'ACTIVE',
  PAST_DUE = 'PAST_DUE',
  CANCELED = 'CANCELED',
  EXPIRED = 'EXPIRED',
}

export enum BillingProviderType {
  STRIPE = 'STRIPE',
  INTERNAL = 'INTERNAL',
}

@Entity('subscriptions')
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'uuid', nullable: true })
  planId!: string;

  @ManyToOne(() => Plan)
  @JoinColumn({ name: 'planId' })
  plan?: Plan;

  @Column({
    type: 'enum',
    enum: SubscriptionStatus,
    default: SubscriptionStatus.TRIALING,
  })
  status!: SubscriptionStatus;

  @Column({
    type: 'enum',
    enum: BillingProviderType,
    default: BillingProviderType.INTERNAL,
  })
  billingProvider!: BillingProviderType;

  @Column({ nullable: true })
  billingCustomerId?: string; // Stripe Customer ID

  @Column({ nullable: true })
  billingSubscriptionId?: string; // Stripe Subscription ID

  @Column({ type: 'int', default: 1 })
  seatCount!: number;

  @Column({ type: 'timestamp', nullable: true })
  trialEndsAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  currentPeriodEnd?: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
