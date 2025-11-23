import { IsOptional, IsString } from 'class-validator';

export class BatchTraceQueryDto {
  @IsString()
  batchCode!: string;

  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsString()
  warehouseId?: string;
}
