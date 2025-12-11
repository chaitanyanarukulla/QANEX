import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { SprintItem } from '../sprints/sprint-item.entity';

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

  @Column({
    type: 'enum',
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'MEDIUM',
  })
  priority!: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

  @Column({
    type: 'enum',
    enum: ['FUNCTIONAL', 'NON_FUNCTIONAL', 'BUG', 'FEATURE', 'ENHANCEMENT'],
    default: 'FUNCTIONAL',
  })
  type!: 'FUNCTIONAL' | 'NON_FUNCTIONAL' | 'BUG' | 'FEATURE' | 'ENHANCEMENT';

  @Column('jsonb', { default: [] })
  acceptanceCriteria!: string[];

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
  sourceDocumentId?: string;

  @Column({ nullable: true })
  sprintId?: string;

  @OneToMany(() => SprintItem, (item) => item.requirement)
  sprintItems?: SprintItem[];

  // We need to import SprintItem circularly or lazily, or just define it.
  // Ideally, use: @OneToMany(() => SprintItem, (item) => item.requirement)
  // But SprintItem needs to be imported.
  // Let's rely on standard TypeORM lazy import string or arrow function.
  // However, I need to check if SprintItem is available.
  // For now, I will add the generic relation, but I need to be careful about imports.
  // I will skip adding the OneToMany here if I can't easily import SprintItem without cycles,
  // EXCEPT the plan said I should.
  // Let's try adding it. I'll need to import SprintItem at the top.

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
