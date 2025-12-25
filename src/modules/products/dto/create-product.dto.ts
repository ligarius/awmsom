import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateProductDto {
  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsBoolean()
  requiresBatch?: boolean;

  @IsOptional()
  @IsBoolean()
  requiresExpiryDate?: boolean;

  @IsString()
  defaultUom!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
