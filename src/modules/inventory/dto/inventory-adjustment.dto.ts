import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateInventoryAdjustmentDto {
  @IsUUID()
  warehouseId: string;

  @IsUUID()
  productId: string;

  @IsOptional()
  @IsUUID()
  batchId?: string;

  @IsUUID()
  locationId: string;

  @IsOptional()
  @IsString()
  uom?: string;

  @Type(() => Number)
  @IsNumber()
  newQty: number;

  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  reference?: string;
}

export class InventoryAdjustmentQueryDto {
  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @IsUUID()
  locationId?: string;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;
}
