import { IsDateString, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class RegisterPutawayDto {
  @IsUUID()
  productId!: string;

  @IsNumber()
  @Min(0)
  quantity!: number;

  @IsOptional()
  @IsString()
  uom?: string;

  @IsUUID()
  toLocationId!: string;

  @IsOptional()
  @IsUUID()
  fromLocationId?: string;

  @IsOptional()
  @IsString()
  batchCode?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;
}
