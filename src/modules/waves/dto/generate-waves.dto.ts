import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { WavePickingStrategy } from '@prisma/client';

export class GenerateWavesDto {
  @IsUUID()
  warehouseId!: string;

  @IsEnum(WavePickingStrategy)
  strategy!: WavePickingStrategy;

  @IsOptional()
  @IsString()
  timeWindowFrom?: string;

  @IsOptional()
  @IsString()
  timeWindowTo?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5000)
  maxOrdersPerWave?: number;

  @IsOptional()
  @IsString()
  carrierCode?: string;

  @IsOptional()
  @IsString()
  routeCode?: string;

  @IsOptional()
  @IsString()
  zoneCode?: string;

  @IsOptional()
  @IsNumber()
  priorityMin?: number;
}
