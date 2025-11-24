import { IsBoolean, IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class CalculateSlottingDto {
  @IsUUID()
  warehouseId!: string;

  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  limitResults?: number;

  @IsOptional()
  @IsBoolean()
  force?: boolean;
}
