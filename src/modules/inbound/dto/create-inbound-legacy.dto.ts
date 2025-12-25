import {
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class CreateInboundLegacyLineDto {
  @IsString()
  @IsNotEmpty()
  sku!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.0001)
  expectedQty!: number;

  @IsString()
  @IsNotEmpty()
  uom!: string;
}

export class CreateInboundLegacyDto {
  @IsOptional()
  @IsString()
  supplier?: string;

  @IsUUID()
  warehouseId!: string;

  @IsOptional()
  @IsDateString()
  expectedDate?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInboundLegacyLineDto)
  lines!: CreateInboundLegacyLineDto[];
}
