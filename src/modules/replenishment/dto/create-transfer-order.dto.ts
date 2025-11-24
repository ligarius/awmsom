import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsOptional, IsUUID, ValidateNested } from 'class-validator';

class TransferOrderLineDto {
  @IsUUID()
  productId!: string;

  @Type(() => Number)
  quantity!: number;
}

export class CreateTransferOrderDto {
  @IsUUID()
  sourceWarehouseId!: string;

  @IsUUID()
  destinationWarehouseId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TransferOrderLineDto)
  lines!: TransferOrderLineDto[];

  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  suggestionIds?: string[];
}
