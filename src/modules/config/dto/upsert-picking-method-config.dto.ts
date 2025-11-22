import { PickingMethodType } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpsertPickingMethodConfigDto {
  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @IsEnum(PickingMethodType)
  method!: PickingMethodType;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}
