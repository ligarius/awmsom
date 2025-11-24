import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class EvaluateReplenishmentDto {
  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @IsBoolean()
  force?: boolean;
}
