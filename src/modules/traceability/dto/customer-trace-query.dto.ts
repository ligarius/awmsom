import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class CustomerTraceQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  customerCode?: string;

  @IsString()
  fromDate!: string;

  @IsString()
  toDate!: string;
}
