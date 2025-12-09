import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

export enum FeedbackType {
    BUG = 'BUG',
    FEATURE = 'FEATURE',
    UX = 'UX',
    OTHER = 'OTHER'
}

@Entity('feedback')
export class Feedback {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column()
    tenantId!: string;

    @Column()
    userId!: string;

    @Column()
    path!: string; // URL where feedback was submitted

    @Column({ type: 'int', nullable: true })
    rating?: number; // 1-5

    @Column({
        type: 'enum',
        enum: FeedbackType,
        default: FeedbackType.OTHER
    })
    category!: FeedbackType;

    @Column('text')
    message!: string;

    @CreateDateColumn()
    createdAt!: Date;
}
