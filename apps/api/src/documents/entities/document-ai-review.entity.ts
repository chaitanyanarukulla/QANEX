import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Document } from './document.entity';

@Entity('document_ai_reviews')
export class DocumentAIReview {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  documentId!: string;

  @OneToOne(() => Document, (document) => document.aiReview, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'documentId' })
  document!: Document;

  @Column('float', { nullable: true })
  score?: number;

  @Column('text', { nullable: true })
  summary?: string;

  // Storing as JSONB for flexibility
  @Column('jsonb', { nullable: true })
  risks?: {
    risk: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    mitigation: string;
  }[];

  @Column('jsonb', { nullable: true })
  gaps?: {
    gap: string;
    suggestion: string;
  }[];

  @UpdateDateColumn()
  analyzedAt!: Date;
}
