import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { UserTenant } from './user-tenant.entity';

export enum UserRole {
  ADMIN = 'ADMIN', // System Admin?
  MEMBER = 'MEMBER',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  firstName!: string;

  @Column()
  lastName!: string;

  @Column({ nullable: true })
  passwordHash?: string; // Nullable if using OIDC only later

  // @Deprecated: Role should be per tenant in UserTenant.
  // Keeping for strict typeorm compatibility until migration script fixes existing data or if system-wide role needed.
  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.MEMBER,
  })
  role!: UserRole;

  @OneToMany(() => UserTenant, (userTenant) => userTenant.user)
  memberships!: UserTenant[];

  // @Deprecated: activeTenantId.
  // We keep it as "Last Active Tenant" for convenience?
  // Or we keep it for backward compatibility for now.
  @Column({ nullable: true })
  tenantId!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
