import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';

import { UserTenant } from '../users/user-tenant.entity';

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
      // Selected provider: openai | gemini | anthropic | foundry_local
      provider?: 'openai' | 'gemini' | 'anthropic' | 'foundry_local';

      // Cloud provider settings (Option 1)
      cloudConfig?: {
        openai?: {
          apiKey: string;
          model: string;
          embeddingModel: string;
        };
        gemini?: {
          apiKey: string;
          model: string;
          embeddingModel: string;
        };
        anthropic?: {
          apiKey: string;
          model: string;
          embeddingProvider: 'openai' | 'foundry_local';
          embeddingApiKey?: string;
        };
      };

      // Foundry Local settings (Option 2)
      foundryLocalConfig?: {
        endpoint: string;
        model: string;
        embeddingModel?: string;
      };
    };
  };

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => UserTenant, (userTenant) => userTenant.tenant)
  memberships!: UserTenant[];
}
