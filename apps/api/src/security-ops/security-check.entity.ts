import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum CheckType {
  VULNERABILITY_SCAN = 'VULNERABILITY_SCAN',
  DEPENDENCY_AUDIT = 'DEPENDENCY_AUDIT',
  CODE_SCAN = 'CODE_SCAN',
  SECRETS_SCAN = 'SECRETS_SCAN',
  COMPLIANCE_CHECK = 'COMPLIANCE_CHECK',
}

export enum CheckStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  PASSED = 'PASSED',
  FAILED = 'FAILED',
  WARNING = 'WARNING',
}

export enum Severity {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  INFO = 'INFO',
}

@Entity('security_checks')
export class SecurityCheck {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  tenantId!: string;

  @Column({ nullable: true })
  releaseId?: string;

  @Column({ type: 'enum', enum: CheckType })
  type!: CheckType;

  @Column({ type: 'enum', enum: CheckStatus, default: CheckStatus.PENDING })
  status!: CheckStatus;

  @Column({ nullable: true })
  name?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column('jsonb', { nullable: true })
  findings?: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    details?: Array<{
      id: string;
      title: string;
      severity: Severity;
      description?: string;
    }>;
  };

  @Column({ type: 'float', nullable: true })
  score?: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ nullable: true })
  completedAt?: Date;
}
