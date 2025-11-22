import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateTenantConfigDto {
  @IsOptional()
  @IsString()
  defaultUom?: string;

  @IsOptional()
  @IsString()
  defaultStockStatus?: string;

  @IsOptional()
  @IsString()
  defaultBatchPolicy?: string;

  @IsOptional()
  @IsBoolean()
  allowNegativeStock?: boolean;

  @IsOptional()
  @IsBoolean()
  enableCycleCounting?: boolean;

  @IsOptional()
  @IsNumber()
  cycleCountDefaultFreqDays?: number;
}
