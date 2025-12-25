import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

export class CreateCycleCountLegacyDto {
  @IsString()
  warehouseId!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  zones?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  locations?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  products?: string[];

  @IsOptional()
  @IsString()
  assignedTo?: string;
}

export class CycleCountExecuteLineDto {
  @IsString()
  location!: string;

  @IsString()
  productId!: string;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  counted?: number;
}

export class CycleCountExecuteDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CycleCountExecuteLineDto)
  lines!: CycleCountExecuteLineDto[];
}

export class CycleCountReviewDto {
  @IsBoolean()
  approve!: boolean;
}
