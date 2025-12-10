import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

export enum RunStatus {
  GENERATED = 'GENERATED',
  PR_CREATED = 'PR_CREATED',
  FAILED = 'FAILED',
}

@Entity('automation_runs')
export class AutomationRun {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  candidateId!: string;

  @Column()
  tenantId!: string;

  @Column({
    type: 'enum',
    enum: RunStatus,
  })
  status!: RunStatus;

  @Column({ nullable: true })
  generatedSnippetPath?: string;

  @Column({ nullable: true })
  githubPrUrl?: string;

  @Column('text', { nullable: true })
  errorLog?: string;

  @CreateDateColumn()
  createdAt!: Date;
}
