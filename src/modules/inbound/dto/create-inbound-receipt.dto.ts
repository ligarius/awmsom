import { Type } from 'class-transformer';
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

class CreateInboundReceiptLineDto {
  @IsUUID()
  productId!: string;

  @IsNumber()
  @Min(0)
  quantity!: number;

  @IsOptional()
  @IsString()
  uom?: string;

  @IsOptional()
  @IsString()
  batchCode?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;
}

export class CreateInboundReceiptDto {
  @IsOptional()
  @IsString()
  reference?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInboundReceiptLineDto)
  @IsNotEmpty({ each: true })
  lines!: CreateInboundReceiptLineDto[];
}

export { CreateInboundReceiptLineDto };
