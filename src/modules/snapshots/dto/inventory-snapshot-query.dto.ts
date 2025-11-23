import { IsDateString, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class InventorySnapshotQueryDto extends PaginationDto {
  @IsOptional()
  @IsDateString()
  snapshotDate?: string;

  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsString()
  batchId?: string;
}
