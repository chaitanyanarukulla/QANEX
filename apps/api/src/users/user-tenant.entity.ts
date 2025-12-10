import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Tenant } from '../tenants/tenant.entity';

// Roles defined in Phase 6.2
export enum OrgRole {
  ORG_ADMIN = 'ORG_ADMIN',
  PM = 'PM',
  EM = 'EM',
  QA = 'QA',
  DEV = 'DEV',
  VIEWER = 'VIEWER',
}

@Entity('user_tenants')
export class UserTenant {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  userId!: string;

  @Column()
  tenantId!: string;

  @ManyToOne(() => User, (user) => user.memberships)
  @JoinColumn({ name: 'userId' })
  user!: User;

  @ManyToOne(() => Tenant, (tenant) => tenant.memberships)
  @JoinColumn({ name: 'tenantId' })
  tenant!: Tenant;

  @Column({
    type: 'enum',
    enum: OrgRole,
    default: OrgRole.VIEWER,
  })
  role!: OrgRole;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
