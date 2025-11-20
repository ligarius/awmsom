import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { InboundReceiptStatus } from '@prisma/client';

export class GetInboundReceiptsFilterDto {
  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @IsOptional()
  @IsEnum(InboundReceiptStatus)
  status?: InboundReceiptStatus;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;
}
