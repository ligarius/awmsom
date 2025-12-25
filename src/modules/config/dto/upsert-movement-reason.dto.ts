import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpsertMovementReasonDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  code!: string;

  @IsString()
  label!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
