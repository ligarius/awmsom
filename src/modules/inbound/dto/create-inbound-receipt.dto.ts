import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateInboundReceiptDto {
  @IsUUID()
  warehouseId!: string;

  @IsOptional()
  @IsString()
  externalRef?: string;
}
