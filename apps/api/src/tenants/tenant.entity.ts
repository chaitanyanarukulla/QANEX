import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';

export enum TenantPlan {
  STARTER = 'STARTER',
  PRO = 'PRO',
  ENTERPRISE = 'ENTERPRISE',
}

@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ unique: true })
  slug!: string;

  @Column({
    type: 'enum',
    enum: TenantPlan,
    default: TenantPlan.STARTER,
  })
  plan!: TenantPlan;

  @Column({ type: 'varchar', default: 'ACTIVE' })
  status!: 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';

  @Column('jsonb', { nullable: true })
  settings?: {
    rqsThreshold?: number;
    rcsThresholds?: Record<string, number>; // env -> score
    aiConfig?: {
      provider?: 'foundry' | 'azure' | 'local' | 'mock';
      apiKey?: string; // Encrypted
    };
  };

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany('UserTenant', 'tenant')
  memberships!: any[]; // specific type import circular dependency avoidance if needed, or import UserTenant
}
