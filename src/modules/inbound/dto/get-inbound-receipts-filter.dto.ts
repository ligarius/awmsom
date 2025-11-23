import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { InboundReceiptStatus } from '@prisma/client';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class GetInboundReceiptsFilterDto extends PaginationDto {
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
