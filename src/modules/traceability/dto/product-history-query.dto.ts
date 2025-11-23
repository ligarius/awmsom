import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class ProductHistoryQueryDto extends PaginationDto {
  @IsString()
  productId!: string;

  @IsOptional()
  @IsString()
  batchCode?: string;

  @IsString()
  fromDate!: string;

  @IsString()
  toDate!: string;

  @IsOptional()
  @IsString()
  warehouseId?: string;
}
