import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { KpiType } from '@prisma/client';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class KpiSnapshotQueryDto extends PaginationDto {
  @IsOptional()
  @IsEnum(KpiType)
  kpiType?: KpiType;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;

  @IsOptional()
  @IsString()
  warehouseId?: string;
}
