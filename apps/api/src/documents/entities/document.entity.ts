import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { DocumentVersion } from './document-version.entity';
import { DocumentAIReview } from './document-ai-review.entity';

export enum DocumentStatus {
  DRAFT = 'DRAFT',
  IN_REVIEW = 'IN_REVIEW',
  AI_ANALYZING = 'AI_ANALYZING',
  FIXING_GAPS = 'FIXING_GAPS',
  READY_FOR_IMPLEMENTATION = 'READY_FOR_IMPLEMENTATION',
  FINAL = 'FINAL',
  ARCHIVED = 'ARCHIVED',
}

export enum DocumentSource {
  MANUAL = 'MANUAL',
  UPLOAD = 'UPLOAD',
  CONFLUENCE = 'CONFLUENCE',
}

@Entity('documents')
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  title!: string;

  @Column('text', { default: '' })
  content!: string;

  @Column({
    type: 'varchar',
    default: DocumentStatus.DRAFT,
  })
  status!: DocumentStatus;

  @Column({
    type: 'enum',
    enum: DocumentSource,
    default: DocumentSource.MANUAL,
  })
  source!: DocumentSource;

  @Column({ nullable: true })
  sourceUrl?: string; // For Confluence URL or external link

  @Column({ nullable: true })
  mimeType?: string; // For uploads (application/pdf, etc)

  @Column()
  tenantId!: string;

  @Column({ nullable: true })
  authorId?: string;

  @OneToMany(() => DocumentVersion, (version) => version.document)
  versions?: DocumentVersion[];

  @OneToOne(() => DocumentAIReview, (review) => review.document)
  aiReview?: DocumentAIReview;

  @OneToMany('Requirement', 'sourceDocument')
  requirements?: any[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
