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
}
