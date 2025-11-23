import { IsDateString, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { OutboundOrderStatus } from '@prisma/client';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class GetOutboundOrdersFilterDto extends PaginationDto {
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
