import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum SprintStatus {
    PLANNED = 'PLANNED',
    ACTIVE = 'ACTIVE',
    COMPLETED = 'COMPLETED',
}

@Entity('sprints')
export class Sprint {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column()
    name!: string;

    @Column({ nullable: true })
    goal?: string;

    @Column({ type: 'timestamp', nullable: true })
    startDate?: Date;

    @Column({ type: 'timestamp', nullable: true })
    endDate?: Date;

    @Column({
        type: 'enum',
        enum: SprintStatus,
        default: SprintStatus.PLANNED,
    })
    status!: SprintStatus;

    @Column({ type: 'int', default: 0 })
    capacity!: number;

    @Column()
    tenantId!: string;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
