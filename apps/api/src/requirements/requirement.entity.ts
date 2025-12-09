import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum RequirementState {
    DRAFT = 'DRAFT',
    PUBLISHED = 'PUBLISHED',
    NEEDS_REVISION = 'NEEDS_REVISION',
    READY = 'READY',
}

@Entity('requirements')
export class Requirement {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column()
    title!: string;

    @Column('text')
    content!: string;

    @Column({
        type: 'enum',
        enum: RequirementState,
        default: RequirementState.DRAFT,
    })
    state!: RequirementState;

    @Column('jsonb', { nullable: true })
    rqs?: {
        score: number;
        clarity: number;
        completeness: number;
        testability: number;
        consistency: number;
        feedback: string[];
    };

    @Column({ nullable: true })
    tenantId!: string; // In real app, this would be a ManyToOne relation

    @Column({ nullable: true })
    sprintId?: string;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
