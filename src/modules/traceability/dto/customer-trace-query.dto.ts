import { IsOptional, IsString } from 'class-validator';

export class CustomerTraceQueryDto {
  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  customerCode?: string;

  @IsString()
  fromDate!: string;

  @IsString()
  toDate!: string;
}
