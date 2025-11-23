import { IsOptional, IsString } from 'class-validator';

export class KpiQueryDto {
  @IsString()
  fromDate!: string;

  @IsString()
  toDate!: string;

  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  productId?: string;
}
