import { IsBoolean, IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class UpdateSlottingConfigDto {
  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  abcPeriodDays?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  xyzPeriodDays?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  goldenZoneLocations?: number;

  @IsOptional()
  @IsBoolean()
  heavyProductsZone?: boolean;

  @IsOptional()
  @IsBoolean()
  fragileProductsZone?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
