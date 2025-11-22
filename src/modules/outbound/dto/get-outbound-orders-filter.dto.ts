import { IsDateString, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { OutboundOrderStatus } from '@prisma/client';

export class GetOutboundOrdersFilterDto {
  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @IsOptional()
  @IsEnum(OutboundOrderStatus)
  status?: OutboundOrderStatus;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;

  @IsOptional()
  @IsString()
  externalRef?: string;

  @IsOptional()
  @IsString()
  customerRef?: string;
}
