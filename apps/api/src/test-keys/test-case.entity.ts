import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum TestPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

@Entity('test_cases')
export class TestCase {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  title!: string;

  @Column('jsonb', { nullable: true })
  steps?: { step: string; expected: string }[];

  @Column({ nullable: true })
  expectedResult?: string;

  @Column({
    type: 'enum',
    enum: TestPriority,
    default: TestPriority.MEDIUM,
  })
  priority!: TestPriority;

  @Column({ nullable: true })
  requirementId?: string;

  @Column()
  tenantId!: string;

  @Column({ default: false })
  isAutomationCandidate!: boolean;

  @Column({ nullable: true })
  automationCandidateReason?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
