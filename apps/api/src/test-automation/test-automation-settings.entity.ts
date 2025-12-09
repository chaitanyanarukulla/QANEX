import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum AutomationFramework {
    PLAYWRIGHT = 'PLAYWRIGHT',
    CYPRESS = 'CYPRESS',
}

@Entity('test_automation_settings')
export class TestAutomationSettings {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column()
    tenantId!: string;

    @Column()
    projectId!: string;

    @Column({
        type: 'enum',
        enum: AutomationFramework,
        default: AutomationFramework.PLAYWRIGHT,
    })
    framework!: AutomationFramework;

    @Column()
    automationRepoOwner!: string; // e.g. my-org

    @Column()
    automationRepoName!: string; // e.g. my-app-tests

    @Column({ default: 'main' })
    defaultBranch!: string;

    @Column({ default: 'tests/e2e' })
    testRootPath!: string;

    @Column({ default: false })
    enabled!: boolean;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
