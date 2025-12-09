import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum BugStatus {
    NEW = 'NEW',
    TRIAGED = 'TRIAGED',
    IN_PROGRESS = 'IN_PROGRESS',
    BLOCKED = 'BLOCKED',
    RESOLVED = 'RESOLVED',
    CLOSED = 'CLOSED'
}

export enum BugSeverity {
    LOW = 'LOW',
    MEDIUM = 'MEDIUM',
    HIGH = 'HIGH',
    CRITICAL = 'CRITICAL'
}

export enum BugPriority {
    P0 = 'P0',
    P1 = 'P1',
    P2 = 'P2',
    P3 = 'P3'
}

@Entity('bugs')
export class Bug {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column()
    title!: string;

    @Column('text')
    description!: string;

    @Column({
        type: 'enum',
        enum: BugStatus,
        default: BugStatus.NEW,
    })
    status!: BugStatus;

    @Column({
        type: 'enum',
        enum: BugSeverity,
        default: BugSeverity.MEDIUM,
    })
    severity!: BugSeverity;

    @Column({
        type: 'enum',
        enum: BugPriority,
        default: BugPriority.P2,
    })
    priority!: BugPriority;

    @Column({ nullable: true })
    linkedRequirementId?: string;

    @Column({ nullable: true })
    linkedTestRunId?: string;

    @Column()
    tenantId!: string;

    @Column({ nullable: true })
    assignedToUserId?: string;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
