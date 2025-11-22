import { IsNumber, IsOptional, IsString } from 'class-validator';

export class PurchaseWebhookDto {
  @IsString()
  reference!: string;

  @IsNumber()
  totalAmount!: number;

  @IsOptional()
  @IsString()
  supplierName?: string;
}
