import {
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class ConfirmInboundReceiptLineDto {
  @IsUUID()
  lineId: string;

  @Type(() => Number)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  receivedQty?: number;

  @IsOptional()
  @IsString()
  batchCode?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;
}

export class ConfirmInboundReceiptDto {
  @IsUUID()
  toLocationId: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConfirmInboundReceiptLineDto)
  lines?: ConfirmInboundReceiptLineDto[];
}
