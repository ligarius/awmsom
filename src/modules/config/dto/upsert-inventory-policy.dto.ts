import { IsNumber, IsOptional, IsUUID } from 'class-validator';

export class UpsertInventoryPolicyDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @IsNumber()
  maxOverReceiptPct?: number;

  @IsOptional()
  @IsNumber()
  maxUnderReceiptPct?: number;

  @IsOptional()
  @IsNumber()
  cycleCountFreqDays?: number;

  @IsOptional()
  @IsNumber()
  maxInventoryVariance?: number;
}
