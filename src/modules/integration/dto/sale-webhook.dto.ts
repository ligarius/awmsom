import { IsNumber, IsOptional, IsString } from 'class-validator';

export class SaleWebhookDto {
  @IsString()
  orderNumber!: string;

  @IsNumber()
  totalAmount!: number;

  @IsOptional()
  @IsString()
  customerName?: string;
}
