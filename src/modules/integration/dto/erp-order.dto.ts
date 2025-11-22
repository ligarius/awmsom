import { IsNumber, IsOptional, IsString } from 'class-validator';

export class ErpOrderDto {
  @IsString()
  orderId!: string;

  @IsString()
  targetSystem!: string;

  @IsNumber()
  totalAmount!: number;

  @IsOptional()
  @IsString()
  currency?: string;
}
