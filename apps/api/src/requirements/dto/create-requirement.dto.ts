import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { RequirementState } from '../requirement.entity';

export class CreateRequirementDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsEnum(RequirementState)
  @IsOptional()
  state?: RequirementState;

  @IsString()
  @IsOptional()
  sourceDocumentId?: string;

  @IsString()
  @IsOptional()
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

  @IsString()
  @IsOptional()
  type?: 'FUNCTIONAL' | 'NON_FUNCTIONAL' | 'BUG' | 'FEATURE' | 'ENHANCEMENT';

  @IsOptional()
  acceptanceCriteria?: string[];

  @IsOptional()
  tasks?: any[];
}
