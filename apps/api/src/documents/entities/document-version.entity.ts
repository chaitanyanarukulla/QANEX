import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Document } from './document.entity';

@Entity('document_versions')
export class DocumentVersion {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  documentId!: string;

  @ManyToOne(() => Document, (document) => document.versions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'documentId' })
  document!: Document;

  @Column()
  versionNumber!: number;

  @Column('text')
  content!: string; // Snapshot of content

  @Column({ nullable: true })
  changeSummary?: string;

  @Column({ nullable: true })
  authorId?: string;

  @CreateDateColumn()
  createdAt!: Date;
}
