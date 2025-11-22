import { ZoneType } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpsertWarehouseZoneConfigDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsUUID()
  warehouseId!: string;

  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsEnum(ZoneType)
  zoneType!: ZoneType;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  allowInbound?: boolean;

  @IsOptional()
  @IsBoolean()
  allowPicking?: boolean;

  @IsOptional()
  @IsBoolean()
  allowStorage?: boolean;

  @IsOptional()
  @IsBoolean()
  allowReturns?: boolean;
}
