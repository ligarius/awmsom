import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class GenerateSlottingRuleDto {
  @IsUUID()
  warehouseId!: string;

  @IsUUID()
  productId!: string;

  @IsOptional()
  @IsIn(['FAST', 'MEDIUM', 'SLOW'])
  velocity?: 'FAST' | 'MEDIUM' | 'SLOW';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  projectedDailyDemand?: number;
}

export class RelocationSuggestionDto {
  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(20)
  maxSuggestions?: number;
}

export class WarehouseBalanceDto {
  @IsUUID()
  productId!: string;

  @IsUUID()
  sourceWarehouseId!: string;

  @IsUUID()
  targetWarehouseId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  quantity!: number;

  @IsString()
  uom!: string;

  @IsOptional()
  @IsBoolean()
  respectCapacity?: boolean;
}
