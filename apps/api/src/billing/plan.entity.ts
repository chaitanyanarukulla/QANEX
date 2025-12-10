import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum PlanKey {
  STARTER = 'starter',
  PRO = 'pro',
  ENTERPRISE = 'enterprise',
}

@Entity('plans')
export class Plan {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true, type: 'enum', enum: PlanKey })
  key!: PlanKey;

  @Column()
  name!: string;

  @Column({ nullable: true })
  description?: string;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  pricePerSeat!: number;

  @Column({ default: 'USD' })
  currency!: string;

  @Column({ type: 'int', nullable: true })
  maxUsers!: number | null; // null = unlimited

  @Column({ type: 'int', nullable: true })
  maxProjects!: number | null;

  @Column('jsonb', { default: {} })
  featureFlags!: Record<string, boolean>;

  @Column({ nullable: true })
  billingProviderPlanId?: string; // e.g. Stripe Price ID

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
