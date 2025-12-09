import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum AuditAction {
    USER_LOGIN = 'USER_LOGIN',
    USER_ROLE_CHANGED = 'USER_ROLE_CHANGED',
    TENANT_SETTINGS_CHANGED = 'TENANT_SETTINGS_CHANGED',
    PROJECT_CREATED = 'PROJECT_CREATED',
    RELEASE_CREATED = 'RELEASE_CREATED',
    // ... add more as needed
}

@Entity('audit_logs')
export class AuditLog {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'uuid' })
    tenantId!: string;

    @Column({ type: 'uuid', nullable: true })
    userId?: string; // Nullable for system actions

    @Column()
    action!: string; // Using string to allow flexibility, or enum above

    @Column({ nullable: true })
    entityType?: string; // USER, PROJECT, etc.

    @Column({ nullable: true })
    entityId?: string;

    @Column('jsonb', { nullable: true })
    metadata?: any;

    @Column({ nullable: true })
    ipAddress?: string;

    @CreateDateColumn()
    createdAt!: Date;
}
