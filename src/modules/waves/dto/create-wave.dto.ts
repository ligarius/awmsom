import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { WavePickingStrategy } from '@prisma/client';

export class CreateWaveDto {
  @IsUUID()
  warehouseId!: string;

  @IsEnum(WavePickingStrategy)
  strategy!: WavePickingStrategy;

  @IsOptional()
  @IsString()
  routeCode?: string;

  @IsOptional()
  @IsString()
  carrierCode?: string;

  @IsOptional()
  @IsString()
  zoneCode?: string;

  @IsOptional()
  @IsString()
  timeWindowFrom?: string;

  @IsOptional()
  @IsString()
  timeWindowTo?: string;
}
