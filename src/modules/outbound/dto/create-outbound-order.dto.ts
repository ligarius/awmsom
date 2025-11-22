import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { IsNumber } from 'class-validator';

class OutboundOrderLineInputDto {
  @IsUUID()
  productId: string;

  @IsNumber()
  requestedQty: number;

  @IsString()
  uom: string;
}

export class CreateOutboundOrderDto {
  @IsUUID()
  warehouseId: string;

  @IsOptional()
  @IsString()
  externalRef?: string;

  @IsOptional()
  @IsString()
  customerRef?: string;

  @IsOptional()
  @IsDateString()
  requestedShipDate?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OutboundOrderLineInputDto)
  lines: OutboundOrderLineInputDto[];
}
