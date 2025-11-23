import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsBoolean()
  requiresBatch?: boolean;

  @IsOptional()
  @IsBoolean()
  requiresExpiryDate?: boolean;

  @IsOptional()
  @IsString()
  defaultUom?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
