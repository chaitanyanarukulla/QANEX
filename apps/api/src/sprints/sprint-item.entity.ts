import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Sprint } from './sprint.entity';
import { Requirement } from '../requirements/requirement.entity';

export enum SprintItemStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  CODE_REVIEW = 'code_review',
  READY_FOR_QA = 'ready_for_qa',
  IN_TESTING = 'in_testing',
  DONE = 'done',
  BACKLOG = 'backlog',
}

export enum SprintItemType {
  FEATURE = 'feature',
  BUG = 'bug',
  TASK = 'task',
}

export enum SprintItemPriority {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

@Entity('sprint_items')
export class SprintItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ nullable: true })
  sprintId?: string;

  @ManyToOne(() => Sprint, { nullable: true })
  @JoinColumn({ name: 'sprintId' })
  sprint?: Sprint;

  @Column({ nullable: true })
  requirementId?: string;

  @ManyToOne(() => Requirement, (req) => req.sprintItems, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'requirementId' })
  requirement?: Requirement;

  @Column({ nullable: true })
  suggestedRole?: string;

  @Column()
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: SprintItemStatus,
    default: SprintItemStatus.BACKLOG,
  })
  status!: SprintItemStatus;

  @Column({
    type: 'enum',
    enum: SprintItemType,
    default: SprintItemType.TASK,
  })
  type!: SprintItemType;

  @Column({
    type: 'enum',
    enum: SprintItemPriority,
    default: SprintItemPriority.MEDIUM,
  })
  priority!: SprintItemPriority;

  @Column({ type: 'int', nullable: true })
  rqsScore?: number;

  @Column({ nullable: true })
  assigneeId?: string;

  @Column({ nullable: true })
  assigneeName?: string;

  @Column({ type: 'int', nullable: true })
  estimatedHours?: number;

  @Column({ type: 'int', nullable: true })
  actualHours?: number;

  @Column()
  tenantId!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
