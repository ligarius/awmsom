import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { IsDecimalNumber } from '../../../shared/validation/is-decimal-number';

class HandlingUnitItemDto {
  @IsString()
  outboundOrderLineId!: string;

  @IsString()
  productId!: string;

  @IsOptional()
  @IsString()
  batchId?: string;

  @IsDecimalNumber()
  quantity!: number;

  @IsString()
  uom!: string;
}

export class AddItemsToHandlingUnitDto {
  @IsString()
  outboundOrderId!: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => HandlingUnitItemDto)
  items!: HandlingUnitItemDto[];
}
