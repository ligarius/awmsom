import { ReplenishmentMethod } from '@prisma/client';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateReplenishmentPolicyDto {
  @IsUUID()
  warehouseId!: string;

  @IsUUID()
  productId!: string;

  @IsEnum(ReplenishmentMethod)
  method!: ReplenishmentMethod;

  @IsOptional()
  @IsInt()
  @Min(0)
  fixedQty?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  minQty?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxQty?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  safetyStock?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  eoqQty?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  daysOfSupply?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  leadTimeDays?: number;

  @IsOptional()
  @IsString()
  periodicity?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
