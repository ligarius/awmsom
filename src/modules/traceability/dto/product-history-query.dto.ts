import { IsOptional, IsString } from 'class-validator';

export class ProductHistoryQueryDto {
  @IsString()
  productId!: string;

  @IsOptional()
  @IsString()
  batchCode?: string;

  @IsString()
  fromDate!: string;

  @IsString()
  toDate!: string;

  @IsOptional()
  @IsString()
  warehouseId?: string;
}
