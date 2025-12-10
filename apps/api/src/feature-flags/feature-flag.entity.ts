import { Entity, Column, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('feature_flags')
@Unique(['tenantId', 'key'])
export class FeatureFlag {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  tenantId!: string;

  @Column()
  key!: string; // e.g. 'beta_automation_prs'

  @Column({ default: false })
  enabled!: boolean;
}
