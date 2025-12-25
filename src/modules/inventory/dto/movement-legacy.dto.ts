import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateMovementDto {
  @IsString()
  productId!: string;

  @Type(() => Number)
  @IsNumber()
  quantity!: number;

  @IsString()
  fromLocation!: string;

  @IsString()
  toLocation!: string;

  @IsOptional()
  @IsString()
  reasonCode?: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  type?: string;
}
