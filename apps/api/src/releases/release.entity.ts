import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ReleaseStatus {
  PLANNED = 'PLANNED',
  ACTIVE = 'ACTIVE',
  FROZEN = 'FROZEN',
  RELEASED = 'RELEASED',
  ABORTED = 'ABORTED',
}

@Entity('releases')
export class Release {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  version!: string;

  @Column({ nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: ReleaseStatus,
    default: ReleaseStatus.PLANNED,
  })
  status!: ReleaseStatus;

  @Column({ nullable: true })
  env!: string; // e.g. 'staging', 'prod'

  // RCS Data
  @Column('float', { default: 0 })
  rcsScore!: number;

  @Column('jsonb', { nullable: true })
  rcsBreakdown?: {
    rp: number; // Requirements & Planning
    qt: number; // Quality & Testing
    b: number; // Bugs
    so: number; // Security & Ops
    details: any;
  };

  @Column('jsonb', { nullable: true })
  rcsExplanation?: {
    summary: string;
    risks: string[];
    strengths: string[];
    generatedAt: string;
  };

  @Column({ nullable: true })
  name?: string;

  @Column()
  tenantId!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
