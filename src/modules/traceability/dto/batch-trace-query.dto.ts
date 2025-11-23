import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class BatchTraceQueryDto extends PaginationDto {
  @IsString()
  batchCode!: string;

  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsString()
  warehouseId?: string;
}
