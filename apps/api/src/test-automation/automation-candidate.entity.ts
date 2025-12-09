import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum CandidateStatus {
    NOT_STARTED = 'NOT_STARTED',
    PR_OPEN = 'PR_OPEN',
    MERGED = 'MERGED',
    REJECTED = 'REJECTED',
}

@Entity('automation_candidates')
export class AutomationCandidate {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column()
    tenantId!: string;

    @Column()
    projectId!: string;

    @Column()
    testCaseId!: string;

    @Column({
        type: 'enum',
        enum: CandidateStatus,
        default: CandidateStatus.NOT_STARTED,
    })
    status!: CandidateStatus;

    @Column({ nullable: true })
    notes?: string;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
