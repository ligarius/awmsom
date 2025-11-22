import { PickingMethodType } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpsertOutboundRuleDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @IsOptional()
  @IsBoolean()
  allowPartialShipments?: boolean;

  @IsOptional()
  @IsBoolean()
  enforceFullAllocation?: boolean;

  @IsOptional()
  @IsEnum(PickingMethodType)
  defaultPickingMethod?: PickingMethodType;

  @IsOptional()
  @IsString()
  defaultShipmentStrategy?: string;
}
