import { IsBoolean, IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class CreateSlottingConfigDto {
  @IsUUID()
  warehouseId!: string;

  @IsInt()
  @Min(1)
  abcPeriodDays!: number;

  @IsInt()
  @Min(1)
  xyzPeriodDays!: number;

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
