import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

export enum TestResultStatus {
    PASS = 'PASS',
    FAIL = 'FAIL',
    BLOCKED = 'BLOCKED',
    SKIPPED = 'SKIPPED',
}

@Entity('test_results')
export class TestResult {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column()
    runId!: string;

    @Column()
    caseId!: string;

    @Column({
        type: 'enum',
        enum: TestResultStatus,
    })
    status!: TestResultStatus;

    @Column({ nullable: true })
    notes?: string;

    @Column()
    tenantId!: string;

    @CreateDateColumn()
    createdAt!: Date;
}
