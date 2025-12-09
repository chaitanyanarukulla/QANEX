import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('ai_logs')
export class AiLog {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column()
    tenantId!: string;

    @Column()
    action!: string; // e.g. 'ANALYZE_REQ', 'TRIAGE_BUG'

    @Column()
    provider!: string; // 'MOCK', 'FOUNDRY'

    @Column()
    latencyMs!: number;

    @Column({ default: true })
    success!: boolean;

    @Column({ type: 'text', nullable: true })
    model!: string;

    @CreateDateColumn()
    timestamp!: Date;
}
